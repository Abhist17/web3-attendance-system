import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-10 text-center">
      <div>
        <h1 className="text-5xl font-bold text-white mb-4">
          🎓 Web3 Attendance
        </h1>
        <p className="text-gray-400 text-xl max-w-xl">
          Decentralized, tamper-proof attendance system built on Solana.
          No proxies. No fakes. On-chain proof.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
        <Link href="/professor">
          <div className="bg-gray-800 hover:bg-gray-700 border border-purple-500 rounded-2xl p-8 cursor-pointer transition group">
            <div className="text-5xl mb-4">👨‍🏫</div>
            <h2 className="text-white text-2xl font-bold group-hover:text-purple-400 transition">
              Professor
            </h2>
            <p className="text-gray-400 mt-2">
              Create lectures, generate live QR codes, view attendance
            </p>
          </div>
        </Link>

        <Link href="/student">
          <div className="bg-gray-800 hover:bg-gray-700 border border-blue-500 rounded-2xl p-8 cursor-pointer transition group">
            <div className="text-5xl mb-4">🎒</div>
            <h2 className="text-white text-2xl font-bold group-hover:text-blue-400 transition">
              Student
            </h2>
            <p className="text-gray-400 mt-2">
              Scan QR code, mark attendance on-chain, view your record
            </p>
          </div>
        </Link>
      </div>

      <div className="flex gap-6 text-sm text-gray-500">
        <span>✅ Anti-proxy QR</span>
        <span>✅ Geolocation verified</span>
        <span>✅ On-chain record</span>
        <span>✅ Wallet identity</span>
      </div>
    </div>
  );
}