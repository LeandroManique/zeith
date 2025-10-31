"use client"

import { motion } from 'framer-motion'
import React from 'react'
import BackgroundCognitive from '../components/BackgroundCognitive'
import ChatZeith from '../components/ChatZeith'

export default function Page() {
  return (
    <main className="relative h-screen w-screen flex items-center justify-center">
      <BackgroundCognitive />

      <div className="flex flex-col items-center justify-center w-full h-full">
        <ChatZeith />
      </div>
    </main>
  )
}
