import { useStore } from '../store.jsx';
import { Download, FileText, CheckCircle, XCircle, Clock } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function History() {
  const { expenses, users, currentUser } = useStore();

  const isEmployee = currentUser.role === 'Employee';

  // Filters
  const data = expenses
    .filter(e => e.status !== 'Pending') // History consists of processed items
    .filter(e => isEmployee ? e.user_id === currentUser.id : e.company_id === currentUser.company_id)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const getUserName = (id) => users.find(u => u.id === id)?.name || 'Unknown';

  const downloadPDF = () => {
    const doc = new jsPDF();
    const title = `${isEmployee ? 'My ' : ''}Expense Reimbursement History`;
    
    doc.setFontSize(18);
    doc.text(title, 14, 22);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()} | User: ${currentUser.name}`, 14, 30);

    const tableRows = data.map(e => [
      e.date,
      getUserName(e.user_id),
      e.vendor,
      e.category,
      `${e.amount} ${e.currency}`,
      e.status
    ]);

    doc.autoTable({
      head: [['Date', 'Employee', 'Vendor', 'Category', 'Amount', 'Status']],
      body: tableRows,
      startY: 35,
      theme: 'grid',
      headStyles: { fillColor: [99, 102, 241] }, // Brand primary
    });

    const filename = `Expenses_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h2>Expense History</h2>
          <p className="text-subtle text-sm mt-2">
            Archived logs of all approved and rejected reimbursement claims.
          </p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={downloadPDF} 
          disabled={data.length === 0}
        >
          <Download size={18} /> Export as PDF
        </button>
      </div>

      <div className="card">
        {data.length === 0 ? (
          <div className="empty-state">
             <Clock size={48} />
             <p>No processed expenses found in history yet.</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Employee</th>
                  <th>Vendor</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.map(e => (
                  <tr key={e.id}>
                    <td>{e.date}</td>
                    <td className="font-medium">{getUserName(e.user_id)}</td>
                    <td>{e.vendor}</td>
                    <td><span className="badge badge-info">{e.category}</span></td>
                    <td className="font-bold">{e.amount} {e.currency}</td>
                    <td>
                      <span className={`badge ${e.status === 'Approved' ? 'badge-success' : 'badge-danger'}`}>
                        {e.status === 'Approved' ? <CheckCircle size={12} /> : <XCircle size={12} />} {e.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
