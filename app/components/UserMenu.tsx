'use client'

import { useState } from 'react'
import Image from 'next/image'

export function UserMenu() {
  const [open, setOpen] = useState(false)

  // Dummy – später durch echte Session ersetzen
  const isLoggedIn = false

  return (
    <div className="relative">
      {/* Avatar Button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-10 h-10 rounded-full overflow-hidden border border-gray-300 dark:border-gray-700 hover:ring-2 hover:ring-pink-500 transition"
        title="User menu"
      >
        <Image
          src="/logo_b.svg"
          alt="User"
          width={40}
          height={40}
          className="object-contain"
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-48 rounded-lg bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 z-50">
          <ul className="py-1 text-sm">
            {!isLoggedIn ? (
              <li>
                <button className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">
                  LOGIN
                </button>
              </li>
            ) : (
              <>
                <li>
                  <button className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">
                    Session
                  </button>
                </li>
                <li>
                  <button className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">
                    Chronik
                  </button>
                </li>
                <li>
                  <button className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">
                    Account
                  </button>
                </li>
                <li className="border-t border-gray-200 dark:border-gray-700 mt-1">
                  <button className="w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700">
                    Logout
                  </button>
                </li>
              </>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
