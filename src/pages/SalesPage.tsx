import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import * as XLSX from 'xlsx'
import { CalendarDays, FileUp, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react'
import { Button } from '../components/Button'
import { PageHeader } from '../components/PageHeader'
import { getCurrentOrganizationId } from '../services/organization'
import { createMenuItem, listMenuItems } from '../services/menu'
import { createSale, createSales, deleteSale, listSales } from '../services/sales'
import type { MenuItem } from '../types/menu'
import type { Sale, SaleChannel } from '../types/sales'

const CHANNELS: { value: SaleChannel; label: string }[] = [
  { value: 'counter', label: 'Balcao' },
  { value: 'ifood', label: 'iFood' },
  { value: 'bysell', label: 'BySell' },
  { value: 'other', label: 'Outros' },
]

function channelLabel(value: SaleChannel) {
  for (const c of CHANNELS) if (c.value === value) return c.label
  return value
}

function brl(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function pct(part: number, whole: number) {
  if (!whole) return 0
  return Math.round((part / whole) * 1000) / 10
}

function normalize(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
}

function today() {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return d.getFullYear() + '-' + m + '-' + day
}

type ParsedRow