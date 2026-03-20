'use client'

import { useState } from 'react'
import { createCase } from '../actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Profile = {
  id: string
  full_name: string | null
  email: string
  phone?: string | null
}

export function CreateCaseForm({
  staffMembers,
  customers,
}: {
  staffMembers: Profile[]
  customers: Profile[]
}) {
  const [clientMode, setClientMode] = useState<'new' | 'existing'>('new')
  const [isSubmitting, setIsSubmitting] = useState(false)

  return (
    <form
      action={async (formData) => {
        setIsSubmitting(true)
        await createCase(formData)
        setIsSubmitting(false)
      }}
      className="space-y-8"
    >
      {/* 1. Client Information Section */}
      <Card>
        <CardHeader>
          <CardTitle>의뢰인 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 mb-4">
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="clientMode"
                value="new"
                checked={clientMode === 'new'}
                onChange={() => setClientMode('new')}
                className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm font-medium text-gray-700">신규 고객 등록</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="clientMode"
                value="existing"
                checked={clientMode === 'existing'}
                onChange={() => setClientMode('existing')}
                className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm font-medium text-gray-700">기존 고객 선택</span>
            </label>
          </div>

          {clientMode === 'new' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">이름</label>
                <input
                  name="clientName"
                  required
                  placeholder="홍길동"
                  className="w-full p-2 border rounded-md"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">전화번호</label>
                <input
                  name="clientPhone"
                  placeholder="010-1234-5678"
                  className="w-full p-2 border rounded-md"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">이메일 (로그인 ID)</label>
                <input
                  name="clientEmail"
                  type="email"
                  required
                  placeholder="client@example.com"
                  className="w-full p-2 border rounded-md"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">임시 비밀번호</label>
                <input
                  name="clientPassword"
                  defaultValue="temp1234"
                  placeholder="기본값: temp1234"
                  className="w-full p-2 border rounded-md"
                />
                <p className="text-xs text-gray-500">고객에게 전달할 초기 비밀번호입니다.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium">고객 선택</label>
              <select
                name="clientId"
                required
                className="w-full p-2 border rounded-md"
              >
                <option value="">고객을 선택하세요</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name} ({c.email}) {c.phone ? `- ${c.phone}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Case Details Section */}
      <Card>
        <CardHeader>
          <CardTitle>사건 상세 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">사건명 (Title)</label>
            <input
              name="title"
              required
              placeholder="예: 강남구 실종자 찾기 의뢰"
              className="w-full p-2 border rounded-md"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">착수금/수임료 (원)</label>
              <input
                name="feeAmount"
                type="number"
                placeholder="1000000"
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">담당 직원 배정</label>
              <select name="assignedStaffId" className="w-full p-2 border rounded-md">
                <option value="">미배정 (나중에 지정)</option>
                {staffMembers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name} ({s.email})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">상담 내용 (Consultation Notes)</label>
            <textarea
              name="consultationNotes"
              rows={4}
              placeholder="초기 상담 내용, 특이사항, 요구사항 등..."
              className="w-full p-2 border rounded-md"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">사건 개요 (Description)</label>
            <textarea
              name="description"
              rows={4}
              placeholder="사건의 구체적인 내용 (고객에게도 일부 공개될 수 있음)"
              className="w-full p-2 border rounded-md"
            />
          </div>

           <div className="space-y-2">
            <label className="text-sm font-medium">초기 상태</label>
             <select name="status" className="w-full p-2 border rounded-md">
                <option value="pending">대기 중 (Pending)</option>
                <option value="active">진행 중 (Active)</option>
             </select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50"
        >
          {isSubmitting ? '등록 중...' : '사건 등록 완료'}
        </button>
      </div>
    </form>
  )
}
