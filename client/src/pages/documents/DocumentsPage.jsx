import { useState } from 'react';
import { FolderLock, Search, FileText, Download, ShieldCheck, UploadCloud } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { Card, Badge, Button, Input, Select, Modal, Table } from '../../components/ui/index.js';
import { addToast } from '../../store/uiSlice.js';

export const DocumentsPage = () => {
  const dispatch = useDispatch();
  const { currentTenant } = useSelector((state) => state.tenant);
  const { user } = useSelector((state) => state.auth);

  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);

  // New Document State
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState('contracts');

  const [documents, setDocuments] = useState([
    {
      id: 'doc-1',
      name: 'Master Service Agreement - Metro Retail 2026.pdf',
      category: 'contracts',
      size: '3.4 MB',
      uploaded_by: 'Alex Rivera',
      created_at: '2026-10-15',
      storage_path: 'acme-logistics/contracts/msa-metro-2026.pdf'
    },
    {
      id: 'doc-2',
      name: 'David Kim - Heavy Equipment Certified Operator License.pdf',
      category: 'certifications',
      size: '1.2 MB',
      uploaded_by: 'Sarah Chen',
      created_at: '2026-10-22',
      storage_path: 'acme-logistics/certifications/dkim-license.pdf'
    },
    {
      id: 'doc-3',
      name: 'Work Order WO-8415 Proof of Delivery & Signoff.pdf',
      category: 'proof_of_delivery',
      size: '4.8 MB',
      uploaded_by: 'David Kim',
      created_at: '2026-11-03',
      storage_path: 'acme-logistics/proof_of_delivery/wo8415-signoff.pdf'
    },
    {
      id: 'doc-4',
      name: 'OSHA Warehouse Compliance Audit Certification.pdf',
      category: 'compliance',
      size: '2.1 MB',
      uploaded_by: 'Sarah Chen',
      created_at: '2026-10-01',
      storage_path: 'acme-logistics/compliance/osha-cert-2026.pdf'
    }
  ]);

  const handleUpload = (e) => {
    e.preventDefault();
    if (!docTitle.trim()) return;

    const fileName = docTitle.endsWith('.pdf') ? docTitle : `${docTitle}.pdf`;
    const newDoc = {
      id: `doc-${Date.now()}`,
      name: fileName,
      category: docCategory,
      size: '1.8 MB',
      uploaded_by: user?.full_name || 'Staff Member',
      created_at: new Date().toISOString().split('T')[0],
      storage_path: `${currentTenant?.slug}/${docCategory}/${fileName}`
    };

    setDocuments([newDoc, ...documents]);
    setModalOpen(false);
    setDocTitle('');

    dispatch(
      addToast({
        type: 'success',
        title: 'Document Uploaded',
        message: `${fileName} stored with presigned S3 encryption`
      })
    );
  };

  const filteredDocs = documents.filter((d) => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCategory === 'all' || d.category === filterCategory;
    return matchSearch && matchCat;
  });

  const columns = [
    {
      key: 'name',
      label: 'Document Name',
      sortable: true,
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-xs text-slate-900 dark:text-white">{val}</div>
            <div className="text-[10px] text-slate-400 font-mono truncate max-w-xs">
              {row.storage_path}
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'category',
      label: 'Category',
      sortable: true,
      render: (val) => (
        <Badge variant="neutral" size="sm" className="capitalize text-[10px]">
          {val.replace(/_/g, ' ')}
        </Badge>
      )
    },
    {
      key: 'uploaded_by',
      label: 'Uploader',
      sortable: true,
      render: (val) => <span className="text-xs text-slate-700 dark:text-slate-300">{val}</span>
    },
    {
      key: 'size',
      label: 'File Size',
      sortable: true,
      render: (val) => <span className="font-mono text-xs">{val}</span>
    },
    {
      key: 'created_at',
      label: 'Uploaded On',
      sortable: true,
      render: (val) => <span className="text-xs text-slate-500">{val}</span>
    },
    {
      key: 'id',
      label: 'Actions',
      render: (_, row) => (
        <button
          type="button"
          onClick={() => {
            dispatch(
              addToast({
                type: 'info',
                title: 'Signed URL Generated',
                message: `Downloading encrypted file from ${row.storage_path}`
              })
            );
          }}
          className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download</span>
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold border border-indigo-200 dark:border-indigo-800/80 mb-1">
            <FolderLock className="w-3 h-3" />
            <span>Encrypted Multi-Tenant Document Vault</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Document Vault
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Tenant-isolated file storage with presigned S3 upload protocols and RLS security for{' '}
            {currentTenant?.name}.
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={() => setModalOpen(true)}>
          <UploadCloud className="w-3.5 h-3.5 mr-1.5" />
          <span>Upload Document</span>
        </Button>
      </div>

      {/* Storage Quota Card */}
      <Card
        variant="default"
        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Storage Quota & Bucket Partition</span>
          </div>
          <div className="text-xs text-slate-500">
            Bucket:{' '}
            <code className="font-mono text-indigo-500">org-documents/{currentTenant?.id}/*</code>
          </div>
        </div>

        <div className="w-full sm:w-64 space-y-1">
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>Used: 11.5 MB</span>
            <span>Capacity: 50 GB</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div className="bg-indigo-600 h-full w-[2%]" />
          </div>
        </div>
      </Card>

      {/* Main Table */}
      <Card variant="default" className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="w-48 sm:w-64">
            <Input
              placeholder="Search document names..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={Search}
              className="text-xs"
            />
          </div>

          <div className="w-48">
            <Select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              options={[
                { value: 'all', label: 'All Categories' },
                { value: 'contracts', label: 'Service Contracts' },
                { value: 'certifications', label: 'Staff Certifications' },
                { value: 'proof_of_delivery', label: 'Proof of Delivery' },
                { value: 'compliance', label: 'Safety Compliance' }
              ]}
            />
          </div>
        </div>

        <Table columns={columns} data={filteredDocs} emptyMessage="No documents found in vault." />
      </Card>

      {/* Upload Document Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Upload Document to Vault"
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleUpload}>
              Upload & Encrypt
            </Button>
          </div>
        }
      >
        <form onSubmit={handleUpload} className="space-y-4 text-xs">
          <Input
            label="Document Title"
            placeholder="e.g. Safety Inspection Certificate 2026"
            value={docTitle}
            onChange={(e) => setDocTitle(e.target.value)}
            required
          />

          <Select
            label="Category"
            value={docCategory}
            onChange={(e) => setDocCategory(e.target.value)}
            options={[
              { value: 'contracts', label: 'Service Contracts' },
              { value: 'certifications', label: 'Staff Certifications' },
              { value: 'proof_of_delivery', label: 'Proof of Delivery & Photos' },
              { value: 'compliance', label: 'Safety & OSHA Compliance' }
            ]}
          />

          <div className="border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-6 text-center space-y-2 hover:border-indigo-500 transition">
            <UploadCloud className="w-8 h-8 text-slate-400 mx-auto" />
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Drag and drop files here, or click to browse
            </div>
            <div className="text-[10px] text-slate-400">PDF, PNG, JPG up to 25MB per file</div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default DocumentsPage;
