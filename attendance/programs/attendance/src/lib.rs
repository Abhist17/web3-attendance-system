use anchor_lang::prelude::*;

declare_id!("6p26MgeSFbR7UFdrsUU62sbNH8Zh1bY59ob8NmfdibBc");

/// PDA seeds are capped at 32 bytes each by the runtime, so any identifier that
/// is used as a seed has to stay within that budget.
pub const MAX_LECTURE_ID_LEN: usize = 32;
pub const MAX_STUDENT_ID_LEN: usize = 32;
pub const MAX_NAME_LEN: usize = 64;
pub const MAX_DEPT_LEN: usize = 64;
pub const MAX_SUBJECT_LEN: usize = 100;

#[program]
pub mod attendance {
    use super::*;

    pub fn register_student(
        ctx: Context<RegisterStudent>,
        student_id: String,
        name: String,
        department: String,
    ) -> Result<()> {
        require!(!student_id.is_empty(), AttendanceError::EmptyIdentifier);
        require!(
            student_id.len() <= MAX_STUDENT_ID_LEN,
            AttendanceError::StudentIdTooLong
        );
        require!(name.len() <= MAX_NAME_LEN, AttendanceError::NameTooLong);
        require!(department.len() <= MAX_DEPT_LEN, AttendanceError::DeptTooLong);

        let profile = &mut ctx.accounts.student_profile;
        profile.wallet = ctx.accounts.signer.key();
        profile.student_id = student_id;
        profile.name = name;
        profile.department = department;
        profile.registered_at = Clock::get()?.unix_timestamp;
        profile.bump = ctx.bumps.student_profile;

        msg!("Student registered: {}", profile.student_id);
        Ok(())
    }

    pub fn create_lecture(
        ctx: Context<CreateLecture>,
        lecture_id: String,
        subject: String,
        start_time: i64,
        attendance_deadline: i64,
    ) -> Result<()> {
        require!(!lecture_id.is_empty(), AttendanceError::EmptyIdentifier);
        require!(
            lecture_id.len() <= MAX_LECTURE_ID_LEN,
            AttendanceError::LectureIdTooLong
        );
        require!(
            subject.len() <= MAX_SUBJECT_LEN,
            AttendanceError::SubjectTooLong
        );
        require!(
            attendance_deadline > start_time,
            AttendanceError::InvalidDeadline
        );

        let lecture = &mut ctx.accounts.lecture;
        lecture.lecture_id = lecture_id;
        lecture.professor = ctx.accounts.professor.key();
        lecture.subject = subject;
        lecture.start_time = start_time;
        lecture.attendance_deadline = attendance_deadline;
        lecture.attendance_count = 0;
        lecture.bump = ctx.bumps.lecture;

        msg!("Lecture created: {}", lecture.lecture_id);
        Ok(())
    }

    /// Marks attendance for the signing student.
    ///
    /// Duplicate submissions are impossible: `attendance_record` is created with
    /// `init`, so a second call for the same (student, lecture) pair fails at the
    /// account-creation step before this handler ever runs.
    pub fn mark_attendance(ctx: Context<MarkAttendance>, lecture_id: String) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let lecture = &ctx.accounts.lecture;

        require!(
            now >= lecture.start_time,
            AttendanceError::LectureNotStarted
        );
        require!(
            now <= lecture.attendance_deadline,
            AttendanceError::AttendanceWindowClosed
        );

        let record = &mut ctx.accounts.attendance_record;
        record.student = ctx.accounts.signer.key();
        record.student_profile = ctx.accounts.student_profile.key();
        record.lecture_id = lecture_id;
        record.timestamp = now;
        record.bump = ctx.bumps.attendance_record;

        let lecture = &mut ctx.accounts.lecture;
        lecture.attendance_count = lecture.attendance_count.saturating_add(1);

        msg!(
            "Attendance marked for lecture {} at {}",
            record.lecture_id,
            now
        );
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(student_id: String)]
pub struct RegisterStudent<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        init,
        payer = signer,
        space = 8 + StudentProfile::INIT_SPACE,
        seeds = [b"student", signer.key().as_ref()],
        bump
    )]
    pub student_profile: Account<'info, StudentProfile>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(lecture_id: String)]
pub struct CreateLecture<'info> {
    #[account(mut)]
    pub professor: Signer<'info>,

    #[account(
        init,
        payer = professor,
        space = 8 + Lecture::INIT_SPACE,
        seeds = [b"lecture", lecture_id.as_bytes()],
        bump
    )]
    pub lecture: Account<'info, Lecture>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(lecture_id: String)]
pub struct MarkAttendance<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        init,
        payer = signer,
        space = 8 + AttendanceRecord::INIT_SPACE,
        seeds = [b"attendance", signer.key().as_ref(), lecture_id.as_bytes()],
        bump
    )]
    pub attendance_record: Account<'info, AttendanceRecord>,

    #[account(
        mut,
        seeds = [b"lecture", lecture_id.as_bytes()],
        bump = lecture.bump
    )]
    pub lecture: Account<'info, Lecture>,

    /// Proves the signer is a registered student. Deriving the PDA from the
    /// signer's key already binds the two, and the explicit constraint makes the
    /// failure mode readable if the stored wallet ever diverges.
    #[account(
        seeds = [b"student", signer.key().as_ref()],
        bump = student_profile.bump,
        constraint = student_profile.wallet == signer.key() @ AttendanceError::WalletMismatch
    )]
    pub student_profile: Account<'info, StudentProfile>,

    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct StudentProfile {
    pub wallet: Pubkey,
    #[max_len(MAX_STUDENT_ID_LEN)]
    pub student_id: String,
    #[max_len(MAX_NAME_LEN)]
    pub name: String,
    #[max_len(MAX_DEPT_LEN)]
    pub department: String,
    pub registered_at: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Lecture {
    #[max_len(MAX_LECTURE_ID_LEN)]
    pub lecture_id: String,
    pub professor: Pubkey,
    #[max_len(MAX_SUBJECT_LEN)]
    pub subject: String,
    pub start_time: i64,
    pub attendance_deadline: i64,
    pub attendance_count: u32,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct AttendanceRecord {
    pub student: Pubkey,
    pub student_profile: Pubkey,
    #[max_len(MAX_LECTURE_ID_LEN)]
    pub lecture_id: String,
    pub timestamp: i64,
    pub bump: u8,
}

#[error_code]
pub enum AttendanceError {
    #[msg("Lecture has not started yet")]
    LectureNotStarted,
    #[msg("Attendance window is closed")]
    AttendanceWindowClosed,
    #[msg("Wallet does not match registered student")]
    WalletMismatch,
    #[msg("Identifier must not be empty")]
    EmptyIdentifier,
    #[msg("Name too long (max 64 chars)")]
    NameTooLong,
    #[msg("Department name too long (max 64 chars)")]
    DeptTooLong,
    #[msg("Subject too long (max 100 chars)")]
    SubjectTooLong,
    #[msg("Student ID too long (max 32 chars)")]
    StudentIdTooLong,
    #[msg("Lecture ID too long (max 32 chars)")]
    LectureIdTooLong,
    #[msg("Deadline must be after start time")]
    InvalidDeadline,
}
