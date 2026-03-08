"use client";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between shadow-lg">
      <div className="flex items-center gap-8">
        <span className="text-xl font-bold text-purple-400">
          🎓 Web3 Attendance
        </span>
        <Link href="/" className="hover:text-purple-300 transition">
          Home
        </Link>
        <Link href="/professor" className="hover:text-purple-300 transition">
          Professor
        </Link>
        <Link href="/student" className="hover:text-purple-300 transition">
          Student
        </Link>
      </div>
      <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700" />
    </nav>
  );
}