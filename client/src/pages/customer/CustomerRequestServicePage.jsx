import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Send, ArrowLeft, Building2, ShieldCheck } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import {
  useCreateCustomerServiceRequestMutation,
  serviceRequestCreateSchema
} from '../../features/customers/index.js';
import { Card, Button } from '../../components/ui/index.js';
import { FormInput, FormSelect, FormTextarea } from '../../components/form/index.js';

export const CustomerRequestServicePage = () => {
  const navigate = useNavigate();
  const createMutation = useCreateCustomerServiceRequestMutation();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(serviceRequestCreateSchema),
    defaultValues: {
      title: '',
      description: '',
      location: '',
      urgency: 'normal',
      service_type: 'repair'
    }
  });

  const onSubmit = async (data) => {
    await createMutation.mutateAsync(data);
    navigate('/customer');
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Navigation & Header */}
      <div>
        <Link
          to="/customer"
          className="inline-flex items-center text-xs text-slate-500 hover:text-indigo-600 transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          <span>Back to Customer Portal</span>
        </Link>
        <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>Request Service or Maintenance</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Submit a new work order directly into operations dispatch for triage and technician
            scheduling.
          </p>
        </div>
      </div>

      <Card variant="default" className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-xs">
          <FormInput
            label="Service Scope / Summary"
            name="title"
            placeholder="e.g. Loading Bay 4 Hydraulic Ramp Stuck Down"
            register={register}
            errors={errors}
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormSelect
              label="Service Category"
              name="service_type"
              register={register}
              errors={errors}
              options={[
                { value: 'repair', label: 'Emergency Equipment Repair' },
                { value: 'maintenance', label: 'Preventative Maintenance & Inspection' },
                { value: 'safety', label: 'Safety Audit & Compliance Certification' },
                { value: 'install', label: 'New Hardware / Asset Commissioning' }
              ]}
            />

            <FormSelect
              label="Urgency & SLA Response"
              name="urgency"
              register={register}
              errors={errors}
              options={[
                { value: 'normal', label: 'Normal (Standard 24-Hour Service)' },
                { value: 'high', label: 'High Priority (Within 8 Hours)' },
                { value: 'urgent', label: 'Urgent Priority (Within 4 Hours)' },
                { value: 'critical', label: 'Critical Outage (Immediate Dispatch)' }
              ]}
            />
          </div>

          <FormInput
            label="Facility / Bay Location"
            name="location"
            placeholder="e.g. Metro Logistics Distribution Hub, Bay 12 East"
            register={register}
            errors={errors}
            required
          />

          <FormTextarea
            label="Detailed Scope, Malfunction Symptoms & Serial Numbers"
            name="description"
            placeholder="Describe specific symptoms, warning lights, asset tag numbers, and any facility safety requirements..."
            rows={5}
            register={register}
            errors={errors}
            required
          />

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-start gap-2.5 text-[11px] text-slate-500">
            <ShieldCheck className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <span>
              Your request will be routed directly to the tenant operations team. Response times are
              guaranteed based on your organization's SLA agreement.
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button variant="ghost" size="sm" type="button" onClick={() => navigate('/customer')}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isSubmitting || createMutation.isPending}
              className="flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>
                {isSubmitting || createMutation.isPending
                  ? 'Dispatching Request...'
                  : 'Submit Service Request to Dispatch'}
              </span>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default CustomerRequestServicePage;
