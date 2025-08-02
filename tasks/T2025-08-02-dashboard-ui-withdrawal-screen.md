# Task: Implement Earnings & Withdrawal Screen

## Description
Create a comprehensive Earnings & Withdrawal screen for professionals to track their income, view transaction history, and request withdrawals. This screen should provide clear financial insights and make it easy for professionals to manage their earnings.

## Acceptance Criteria
* Balance overview section:
  - Available balance (ready for withdrawal)
  - Pending balance (in 15-day holding period)
  - Total earnings (all-time)
  - Next automatic release date
* Earnings chart with:
  - Toggle between daily/weekly/monthly views
  - Line graph showing earnings trend
  - Comparison with previous period
  - Export data option (CSV/PDF)
* Transaction history table:
  - Date and time
  - Service name and booking ID
  - Customer name
  - Amount (gross and net after fees)
  - Status (pending, available, withdrawn)
  - Filter by date range and status
  - Search by customer or service
  - Pagination (20 items per page)
* Withdrawal section:
  - Minimum withdrawal amount display (R$10)
  - Available withdrawal methods:
    - PIX (instant)
    - TED (next business day)
  - Bank account details on file
  - Withdrawal fee information
  - Request withdrawal form
* Tax summary section:
  - Year-to-date earnings
  - Tax withholding information
  - Generate tax report/invoice
  - Download fiscal notes
* Withdrawal history:
  - Past withdrawal requests
  - Status tracking
  - Transaction receipts
* Mobile-optimized with key info prioritized

## Technical Implementation
* **Components to create:**
  - `EarningsWithdrawal.tsx` - Main container
  - `BalanceOverview.tsx` - Balance cards display
  - `EarningsChart.tsx` - Chart visualization
  - `TransactionHistory.tsx` - Transaction table
  - `WithdrawalForm.tsx` - Withdrawal request form
  - `TaxSummary.tsx` - Tax information section
  - `WithdrawalHistory.tsx` - Past withdrawals list
  - `ExportOptions.tsx` - Data export functionality

* **tRPC API calls:**
  - `earnings.getBalance(professionalId)` - Get balance breakdown
  - `earnings.getTransactions(professionalId, filters)` - Transaction history
  - `earnings.getChartData(professionalId, period)` - Chart data
  - `withdrawals.request(professionalId, amount, method)` - Request withdrawal
  - `withdrawals.getHistory(professionalId)` - Withdrawal history
  - `earnings.getTaxSummary(professionalId, year)` - Tax information
  - `earnings.exportData(professionalId, format, dateRange)` - Export data

* **Features to implement:**
  - Real-time balance updates
  - Chart period comparison calculations
  - CSV/PDF export generation
  - Invoice PDF generation
  - Withdrawal validation rules
  - Fee calculation display

* **Business rules:**
  - 15-day holding period for new earnings
  - Minimum withdrawal: R$10
  - PIX fee: R$0 (free)
  - TED fee: R$5.90
  - Platform fee: 10% of service value

## Dependencies
* Recharts for data visualization
* React Query for data fetching
* Date range picker component
* PDF generation library (invoice/reports)
* CSV export utility
* Currency formatting utilities

## Related Tasks
* T2025-08-02-frontend-earnings-withdrawal.md - Original task
* T2025-08-02-implement-backend-withdrawal-request.md - Backend API
* T2025-08-02-implement-escrow-logic.md - Escrow system
* T2025-08-02-implement-professional-dashboard.md - Dashboard integration