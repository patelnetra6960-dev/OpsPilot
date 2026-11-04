import { useState } from 'react';
import { Send } from 'lucide-react';
import { Card, Button, Input, Select } from '../../components/ui/index.js';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { addToast } from '../../store/uiSlice.js';

export const CustomerRequestServicePage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [serviceType, setServiceType] = useState('repair');
  const [siteLocation, setSiteLocation] = useState('Metro Logistics Hub Bay 12');
  const [urgency, setUrgency] = useState('standard');
  const [description, setDescription] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!description.trim()) return;

    dispatch(
      addToast({
        type: 'success',
        title: 'Service Request Logged',
        message: 'Dispatched to Acme operations lead for immediate scheduling'
      })
    );
    navigate('/customer');
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
          Request Service or Maintenance
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Submit a new work order directly into the operations scheduling board.
        </p>
      </div>

      <Card variant="default" className="p-6 space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <Select
            label="Service Category"
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value)}
            options={[
              { value: 'repair', label: 'Emergency Equipment Repair' },
              { value: 'maintenance', label: 'Preventative Maintenance & Inspection' },
              { value: 'safety', label: 'Safety Audit & Compliance Certification' },
              { value: 'install', label: 'New Asset / Equipment Installation' }
            ]}
          />

          <Input
            label="Facility / Site Location"
            value={siteLocation}
            onChange={(e) => setSiteLocation(e.target.value)}
            required
          />

          <Select
            label="Service Urgency"
            value={urgency}
            onChange={(e) => setUrgency(e.target.value)}
            options={[
              { value: 'standard', label: 'Standard (Within 24 Hours)' },
              { value: 'urgent', label: 'Urgent Priority (Within 4 Hours)' },
              { value: 'critical', label: 'Critical Outage (Immediate Dispatch)' }
            ]}
          />

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Detailed Scope & Equipment Info
            </label>
            <textarea
              rows="4"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe equipment malfunction, serial number, bay number, and any safety hazards..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-transparent text-slate-900 dark:text-white"
              required
            />
          </div>

          <div className="pt-2">
            <Button type="submit" variant="primary" className="w-full" size="md">
              <Send className="w-4 h-4 mr-2" />
              <span>Submit Service Request to Dispatch</span>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default CustomerRequestServicePage;
