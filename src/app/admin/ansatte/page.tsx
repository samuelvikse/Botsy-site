'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Search,
  Plus,
  MoreHorizontal,
  Mail,
  Phone,
  Calendar,
  TrendingUp,
  Star,
  Edit,
  Trash2,
  Users,
  DollarSign,
  Award,
  Shield,
  ArrowLeft
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { SubscriptionGate } from '@/components/SubscriptionGate'
import { PermissionProvider } from '@/contexts/PermissionContext'

type Employee = {
  id: number
  name: string
  email: string
  phone: string
  role: string
  department: string
  startDate: string
  status: 'active' | 'leave' | 'inactive'
  avatar: string
  sales: number
  salesTarget: number
  rating: number
  tasksCompleted: number
}

export default function EmployeesPage() {
  return (
    <ProtectedRoute>
      <PermissionProvider>
        <SubscriptionGate>
          <EmployeesContent />
        </SubscriptionGate>
      </PermissionProvider>
    </ProtectedRoute>
  )
}

function EmployeesContent() {
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [, setShowSalaryModal] = useState(false)
  const [verified2FA, setVerified2FA] = useState(false)

  const employees: Employee[] = [
    {
      id: 1,
      name: 'Anna Larsen',
      email: 'anna@bedrift.no',
      phone: '+47 912 34 567',
      role: 'Salgssjef',
      department: 'Salg',
      startDate: '2022-03-15',
      status: 'active',
      avatar: 'AL',
      sales: 145000,
      salesTarget: 120000,
      rating: 4.8,
      tasksCompleted: 47
    },
    {
      id: 2,
      name: 'Per Hansen',
      email: 'per@bedrift.no',
      phone: '+47 923 45 678',
      role: 'Kundeservice',
      department: 'Support',
      startDate: '2023-01-10',
      status: 'active',
      avatar: 'PH',
      sales: 98000,
      salesTarget: 80000,
      rating: 4.6,
      tasksCompleted: 89
    },
    {
      id: 3,
      name: 'Lisa Berg',
      email: 'lisa@bedrift.no',
      phone: '+47 934 56 789',
      role: 'Markedsføring',
      department: 'Marketing',
      startDate: '2023-06-01',
      status: 'active',
      avatar: 'LB',
      sales: 0,
      salesTarget: 0,
      rating: 4.9,
      tasksCompleted: 62
    },
    {
      id: 4,
      name: 'Erik Olsen',
      email: 'erik@bedrift.no',
      phone: '+47 945 67 890',
      role: 'Utvikler',
      department: 'Tech',
      startDate: '2021-09-20',
      status: 'leave',
      avatar: 'EO',
      sales: 0,
      salesTarget: 0,
      rating: 4.7,
      tasksCompleted: 156
    }
  ]

  const statusColors = {
    active: 'bg-green-500/10 text-green-400',
    leave: 'bg-yellow-500/10 text-yellow-400',
    inactive: 'bg-red-500/10 text-red-400'
  }

  const statusLabels = {
    active: 'Aktiv',
    leave: 'Permisjon',
    inactive: 'Sluttet'
  }

  return (
    <div className="min-h-screen bg-botsy-dark">
      {/* Header */}
      <div className="border-b border-white/[0.06] bg-botsy-dark-deep/50">
        <div className="container mx-auto h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-[#6B7A94] hover:text-white transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <Image
              src="/brand/botsy-full-logo.svg"
              alt="Botsy"
              width={100}
              height={32}
              className="h-8 w-auto"
            />
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Legg til ansatt
          </Button>
        </div>
      </div>

      <div className="container mx-auto py-8 px-4">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Employee List */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-white mb-1">Ansatte</h1>
                <p className="text-[#6B7A94]">{employees.length} ansatte totalt</p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-botsy-lime/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-botsy-lime" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{employees.filter(e => e.status === 'active').length}</p>
                    <p className="text-[#6B7A94] text-sm">Aktive</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">112%</p>
                    <p className="text-[#6B7A94] text-sm">Gj.snitt måloppnåelse</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                    <Star className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">4.7</p>
                    <p className="text-[#6B7A94] text-sm">Gj.snitt vurdering</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                    <Award className="h-5 w-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">354</p>
                    <p className="text-[#6B7A94] text-sm">Oppgaver fullført</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Search */}
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#6B7A94]" />
              <input
                type="text"
                placeholder="Søk etter ansatt..."
                className="w-full h-12 pl-12 pr-4 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-[#6B7A94] focus:outline-none focus:border-botsy-lime/50"
              />
            </div>

            {/* Employee Cards */}
            <div className="space-y-3">
              {employees.map((employee) => (
                <Card
                  key={employee.id}
                  className={`p-5 cursor-pointer transition-all ${
                    selectedEmployee?.id === employee.id ? 'border-botsy-lime/50' : ''
                  }`}
                  onClick={() => setSelectedEmployee(employee)}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-white/[0.1] flex items-center justify-center text-white font-medium">
                      {employee.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-white font-medium">{employee.name}</p>
                        <Badge className={statusColors[employee.status]}>
                          {statusLabels[employee.status]}
                        </Badge>
                      </div>
                      <p className="text-[#6B7A94] text-sm">{employee.role} • {employee.department}</p>
                    </div>
                    <div className="text-right hidden sm:block">
                      <div className="flex items-center gap-1 justify-end mb-1">
                        <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                        <span className="text-white font-medium">{employee.rating}</span>
                      </div>
                      <p className="text-[#6B7A94] text-sm">{employee.tasksCompleted} oppgaver</p>
                    </div>
                    <button className="p-2 text-[#6B7A94] hover:text-white hover:bg-white/[0.05] rounded-lg">
                      <MoreHorizontal className="h-5 w-5" />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Employee Detail Panel */}
          {selectedEmployee && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="w-full lg:w-96"
            >
              <Card className="p-6 sticky top-6">
                <div className="text-center mb-6">
                  <div className="h-20 w-20 rounded-full bg-white/[0.1] flex items-center justify-center text-white font-medium text-2xl mx-auto mb-4">
                    {selectedEmployee.avatar}
                  </div>
                  <h2 className="text-xl font-bold text-white">{selectedEmployee.name}</h2>
                  <p className="text-[#6B7A94]">{selectedEmployee.role}</p>
                  <Badge className={`mt-2 ${statusColors[selectedEmployee.status]}`}>
                    {statusLabels[selectedEmployee.status]}
                  </Badge>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-[#6B7A94]" />
                    <span className="text-white text-sm">{selectedEmployee.email}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-[#6B7A94]" />
                    <span className="text-white text-sm">{selectedEmployee.phone}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-[#6B7A94]" />
                    <span className="text-white text-sm">
                      Startet {new Date(selectedEmployee.startDate).toLocaleDateString('nb-NO')}
                    </span>
                  </div>
                </div>

                <div className="border-t border-white/[0.06] pt-6 mb-6">
                  <h3 className="text-white font-medium mb-4">Ytelse</h3>
                  <div className="space-y-4">
                    {selectedEmployee.salesTarget > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[#6B7A94] text-sm">Salg</span>
                          <span className="text-white text-sm font-medium">
                            {Math.round((selectedEmployee.sales / selectedEmployee.salesTarget) * 100)}%
                          </span>
                        </div>
                        <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-botsy-lime rounded-full"
                            style={{ width: `${Math.min((selectedEmployee.sales / selectedEmployee.salesTarget) * 100, 100)}%` }}
                          />
                        </div>
                        <p className="text-[#6B7A94] text-xs mt-1">
                          {selectedEmployee.sales.toLocaleString()} kr / {selectedEmployee.salesTarget.toLocaleString()} kr
                        </p>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-[#6B7A94] text-sm">Kundevurdering</span>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                        <span className="text-white font-medium">{selectedEmployee.rating}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#6B7A94] text-sm">Oppgaver fullført</span>
                      <span className="text-white font-medium">{selectedEmployee.tasksCompleted}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-white/[0.06] pt-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-medium">Lønnsdata</h3>
                    <Shield className="h-4 w-4 text-[#6B7A94]" />
                  </div>
                  {!verified2FA ? (
                    <div className="text-center p-4 bg-white/[0.02] rounded-xl">
                      <Shield className="h-8 w-8 text-[#6B7A94] mx-auto mb-2" />
                      <p className="text-[#6B7A94] text-sm mb-3">
                        Lønnsdata krever 2FA-verifisering
                      </p>
                      <Button size="sm" onClick={() => setVerified2FA(true)}>
                        Verifiser med 2FA
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-white/[0.02] rounded-lg">
                        <span className="text-[#6B7A94] text-sm">Grunnlønn</span>
                        <span className="text-white font-medium">52 500 kr/mnd</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white/[0.02] rounded-lg">
                        <span className="text-[#6B7A94] text-sm">Siste bonus</span>
                        <span className="text-botsy-lime font-medium">+8 000 kr</span>
                      </div>
                      <Button variant="outline" size="sm" className="w-full" onClick={() => setShowSalaryModal(true)}>
                        <DollarSign className="h-4 w-4 mr-2" />
                        Administrer lønn
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Edit className="h-4 w-4 mr-2" />
                    Rediger
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-400 hover:text-red-300 hover:border-red-400/50">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>

              {/* AI Assistant */}
              <Card className="p-6 mt-4">
                <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                  <span className="h-6 w-6 rounded-full bg-botsy-lime/20 flex items-center justify-center">
                    <Image src="/brand/botsy-icon.svg" alt="Botsy" width={16} height={16} />
                  </span>
                  Spør Botsy om {selectedEmployee.name.split(' ')[0]}
                </h3>
                <div className="space-y-2">
                  {[
                    `Fortjener ${selectedEmployee.name.split(' ')[0]} lønnsøkning?`,
                    `Hvordan presterer ${selectedEmployee.name.split(' ')[0]}?`,
                    'Foreslå bonus basert på ytelse'
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      className="w-full p-3 text-left text-sm text-[#A8B4C8] bg-white/[0.02] hover:bg-white/[0.05] rounded-lg transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
