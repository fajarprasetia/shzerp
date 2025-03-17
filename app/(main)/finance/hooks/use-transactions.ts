"use client"

import { useState, useEffect } from "react"
import { Transaction } from "@/types/finance"

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTransactions()
  }, [])

  async function fetchTransactions() {
    try {
      const response = await fetch("/api/finance/transactions")
      if (!response.ok) {
        throw new Error("Failed to fetch transactions")
      }
      const data = await response.json()
      setTransactions(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  async function addTransaction(newTransaction: Omit<Transaction, "id">) {
    try {
      const response = await fetch("/api/finance/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newTransaction),
      })

      if (!response.ok) {
        throw new Error("Failed to add transaction")
      }

      const addedTransaction = await response.json()
      setTransactions((prev) => [...prev, addedTransaction])
      return addedTransaction
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      throw err
    }
  }

  async function deleteTransaction(id: string) {
    try {
      const response = await fetch(`/api/finance/transactions/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete transaction")
      }

      setTransactions((prev) => prev.filter((t) => t.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      throw err
    }
  }

  return {
    transactions,
    isLoading,
    error,
    addTransaction,
    deleteTransaction,
    mutate: fetchTransactions,
  }
} 