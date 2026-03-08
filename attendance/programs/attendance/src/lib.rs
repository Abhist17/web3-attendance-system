use anchor_lang::prelude::*;

declare_id!("6p26MgeSFbR7UFdrsUU62sbNH8Zh1bY59ob8NmfdibBc");

#[program]
pub mod attendance {
    use super::*;

    pub fn register_student(
        ctx: Context<RegisterStudent>,
        student_id: u64,
        name: String,
        department: String,
    ) -> Result<()> {
        require!(name.len() <= 50, AttendanceError::NameTooLong);
        require!(department.len() <= 50, AttendanceError::DeptTooLong);

        let profile = &mut ctx.accounts.student_profile;
        profile.wallet      = *ctx.accounts.signer.key;
        profile.student_id  = student_id;
        profile.name        = name;
        profile.department  = department;
        profile.bump        = ctx.bumps.student_profile;

        msg!("Student registered: {}", student_id);
        Ok(())
    }

    pub fn create_lecture(
        ctx: Context<CreateLecture>,
        lecture_id: u64,
        subject: String,
        start_time: i64,
        attendance_deadline: i64,
    ) -> Result<()> {
        require!(subject.len() <= 100, AttendanceError::SubjectTooLong);
        require!(attendance_deadline > start_time, AttendanceError::InvalidDeadline);

        let lecture = &mut ctx.accounts.lecture;
        lecture.lecture_id           = lecture_id;
        lecture.professor            = *ctx.accounts.professor.key;
        lecture.subject              = subject;
        lecture.start_time           = start_time;
        lecture.attendance_deadline  = attendance_deadline;
        lecture.bump                 = ctx.bumps.lecture;

        msg!("Lecture created: {}", lecture_id);
        Ok(())
    }

    pub fn mark_attendance(
        ctx: Context<MarkAttendance>,
        lecture_id: u64,
    ) -> Result<()> {
        let clock = Clock::get()?;
        let now   = clock.unix_timestamp;

        let lecture = &ctx.accounts.lecture;
        require!(now >= lecture.start_time,          AttendanceError::LectureNotStarted);
        require!(now <= lecture.attendance_deadline, AttendanceError::AttendanceWindowClosed);

        let profile = &ctx.accounts.student_profile;
        require!(
            profile.wallet == *ctx.accounts.signer.key,
            AttendanceError::WalletMismatch
        );

        let record = &mut ctx.accounts.attendance_record;
        record.student    = *ctx.accounts.signer.key;
        record.lecture_id = lecture_id;
        record.timestamp  = now;
        record.bump       = ctx.bumps.attendance_record;

        msg!("Attendance marked for lecture {} at {}", lecture_id, now);
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(student_id: u64)]
pub struct RegisterStudent<'info> {
    #[account(
        init,
        payer  = signer,
        space  = StudentProfile::LEN,
        seeds  = [b"student", signer.key().as_ref()],
        bump
    )]
    pub student_profile: Account<'info, StudentProfile>,

    #[account(mut)]
    pub signer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(lecture_id: u64)]
pub struct CreateLecture<'info> {
    #[account(
        init,
        payer  = professor,
        space  = Lecture::LEN,
        seeds  = [b"lecture", lecture_id.to_le_bytes().as_ref()],
        bump
    )]
    pub lecture: Account<'info, Lecture>,

    #[account(mut)]
    pub professor: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(lecture_id: u64)]
pub struct MarkAttendance<'info> {
    #[account(
        init,
        payer  = signer,
        space  = AttendanceRecord::LEN,
        seeds  = [b"attendance", signer.key().as_ref(), lecture_id.to_le_bytes().as_ref()],
        bump
    )]
    pub attendance_record: Account<'info, AttendanceRecord>,

    #[account(
        seeds = [b"lecture", lecture_id.to_le_bytes().as_ref()],
        bump  = lecture.bump
    )]
    pub lecture: Account<'info, Lecture>,

    #[account(
        seeds = [b"student", signer.key().as_ref()],
        bump  = student_profile.bump
    )]
    pub student_profile: Account<'info, StudentProfile>,

    #[account(mut)]
    pub signer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[account]
pub struct StudentProfile {
    pub wallet:     Pubkey,
    pub student_id: u64,
    pub name:       String,
    pub department: String,
    pub bump:       u8,
}

impl StudentProfile {
    pub const LEN: usize = 8 + 32 + 8 + (4 + 50) + (4 + 50) + 1;
}

#[account]
pub struct Lecture {
    pub lecture_id:          u64,
    pub professor:           Pubkey,
    pub subject:             String,
    pub start_time:          i64,
    pub attendance_deadline: i64,
    pub bump:                u8,
}

impl Lecture {
    pub const LEN: usize = 8 + 8 + 32 + (4 + 100) + 8 + 8 + 1;
}

#[account]
pub struct AttendanceRecord {
    pub student:    Pubkey,
    pub lecture_id: u64,
    pub timestamp:  i64,
    pub bump:       u8,
}

impl AttendanceRecord {
    pub const LEN: usize = 8 + 32 + 8 + 8 + 1;
}

#[error_code]
pub enum AttendanceError {
    #[msg("Lecture has not started yet")]
    LectureNotStarted,
    #[msg("Attendance window is closed")]
    AttendanceWindowClosed,
    #[msg("Wallet does not match registered student")]
    WalletMismatch,
    #[msg("Name too long (max 50 chars)")]
    NameTooLong,
    #[msg("Department name too long (max 50 chars)")]
    DeptTooLong,
    #[msg("Subject too long (max 100 chars)")]
    SubjectTooLong,
    #[msg("Deadline must be after start time")]
    InvalidDeadline,
}
