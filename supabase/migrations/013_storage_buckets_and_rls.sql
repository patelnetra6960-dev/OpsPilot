-- OpsPilot PostgreSQL Schema Migration: 013_storage_buckets_and_rls.sql
-- Description: Production Supabase Storage Buckets Configuration & Multi-Tenant Partitioning Policies
--              Buckets: org-documents, customer-attachments, project-files, work-order-photos, invoice-documents, org-assets

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
        
        -- =====================================================================
        -- 1. Create All 5 Domain Storage Buckets (+ Public org-assets)
        -- =====================================================================
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES 
            (
                'org-assets', 
                'org-assets', 
                true, 
                5242880, -- 5 MB (Logos, branding, public profile avatars)
                ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
            ),
            (
                'org-documents', 
                'org-documents', 
                false, 
                52428800, -- 50 MB (Corporate policies, SOPs, legal contracts)
                ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'image/png', 'image/jpeg']
            ),
            (
                'customer-attachments', 
                'customer-attachments', 
                false, 
                26214400, -- 25 MB (Customer service intake files, warranty documents, site permits)
                ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg', 'image/webp']
            ),
            (
                'project-files', 
                'project-files', 
                false, 
                104857600, -- 100 MB (Engineering blueprints, technical schematics, project deliverables)
                ARRAY['application/pdf', 'image/png', 'image/jpeg', 'application/zip', 'application/x-zip-compressed', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
            ),
            (
                'work-order-photos', 
                'work-order-photos', 
                false, 
                26214400, -- 25 MB (Field technician job photos, asset condition images, proof of completion)
                ARRAY['image/png', 'image/jpeg', 'image/webp']
            ),
            (
                'invoice-documents', 
                'invoice-documents', 
                false, 
                15728640, -- 15 MB (Itemized billing PDFs, tax receipts, payment verification slips)
                ARRAY['application/pdf', 'image/png', 'image/jpeg']
            )
        ON CONFLICT (id) DO UPDATE SET
            public = EXCLUDED.public,
            file_size_limit = EXCLUDED.file_size_limit,
            allowed_mime_types = EXCLUDED.allowed_mime_types;

        -- =====================================================================
        -- 2. Enable RLS on storage.objects
        -- =====================================================================
        ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

        -- =====================================================================
        -- 3. Multi-Tenant Storage Isolation Policies
        -- Storage Folder Partitioning Schema: <organization_id>/<category_or_entity_id>/<file_name>
        -- =====================================================================

        -- 3.1 Organization Documents (Internal staff only, customers blocked)
        DROP POLICY IF EXISTS "Staff read org documents" ON storage.objects;
        CREATE POLICY "Staff read org documents"
            ON storage.objects FOR SELECT
            USING (
                bucket_id = 'org-documents' AND
                (
                    public.is_superadmin() OR
                    (
                        public.is_member_of((storage.foldername(name))[1]::uuid) AND
                        NOT public.has_org_role((storage.foldername(name))[1]::uuid, ARRAY['customer'])
                    )
                )
            );

        DROP POLICY IF EXISTS "Staff upload org documents" ON storage.objects;
        CREATE POLICY "Staff upload org documents"
            ON storage.objects FOR INSERT
            WITH CHECK (
                bucket_id = 'org-documents' AND
                (
                    public.is_superadmin() OR
                    (
                        public.is_member_of((storage.foldername(name))[1]::uuid) AND
                        public.has_org_role((storage.foldername(name))[1]::uuid, ARRAY['owner', 'admin', 'manager', 'employee'])
                    )
                )
            );

        DROP POLICY IF EXISTS "Managers delete org documents" ON storage.objects;
        CREATE POLICY "Managers delete org documents"
            ON storage.objects FOR DELETE
            USING (
                bucket_id = 'org-documents' AND
                (
                    public.is_superadmin() OR
                    public.has_org_role((storage.foldername(name))[1]::uuid, ARRAY['owner', 'admin', 'manager'])
                )
            );

        -- 3.2 Customer Attachments (Internal staff + Customer for their own folder)
        DROP POLICY IF EXISTS "Read customer attachments" ON storage.objects;
        CREATE POLICY "Read customer attachments"
            ON storage.objects FOR SELECT
            USING (
                bucket_id = 'customer-attachments' AND
                (
                    public.is_superadmin() OR
                    (
                        public.is_member_of((storage.foldername(name))[1]::uuid) AND
                        (
                            NOT public.has_org_role((storage.foldername(name))[1]::uuid, ARRAY['customer']) OR
                            (storage.foldername(name))[2] = public.get_customer_id((storage.foldername(name))[1]::uuid)::text
                        )
                    )
                )
            );

        DROP POLICY IF EXISTS "Upload customer attachments" ON storage.objects;
        CREATE POLICY "Upload customer attachments"
            ON storage.objects FOR INSERT
            WITH CHECK (
                bucket_id = 'customer-attachments' AND
                (
                    public.is_superadmin() OR
                    (
                        public.is_member_of((storage.foldername(name))[1]::uuid) AND
                        (
                            public.has_org_role((storage.foldername(name))[1]::uuid, ARRAY['owner', 'admin', 'manager', 'employee']) OR
                            (storage.foldername(name))[2] = public.get_customer_id((storage.foldername(name))[1]::uuid)::text
                        )
                    )
                )
            );

        DROP POLICY IF EXISTS "Managers delete customer attachments" ON storage.objects;
        CREATE POLICY "Managers delete customer attachments"
            ON storage.objects FOR DELETE
            USING (
                bucket_id = 'customer-attachments' AND
                (
                    public.is_superadmin() OR
                    public.has_org_role((storage.foldername(name))[1]::uuid, ARRAY['owner', 'admin', 'manager'])
                )
            );

        -- 3.3 Project Files (Internal staff only, customers blocked)
        DROP POLICY IF EXISTS "Staff read project files" ON storage.objects;
        CREATE POLICY "Staff read project files"
            ON storage.objects FOR SELECT
            USING (
                bucket_id = 'project-files' AND
                (
                    public.is_superadmin() OR
                    (
                        public.is_member_of((storage.foldername(name))[1]::uuid) AND
                        NOT public.has_org_role((storage.foldername(name))[1]::uuid, ARRAY['customer'])
                    )
                )
            );

        DROP POLICY IF EXISTS "Staff upload project files" ON storage.objects;
        CREATE POLICY "Staff upload project files"
            ON storage.objects FOR INSERT
            WITH CHECK (
                bucket_id = 'project-files' AND
                (
                    public.is_superadmin() OR
                    (
                        public.is_member_of((storage.foldername(name))[1]::uuid) AND
                        public.has_org_role((storage.foldername(name))[1]::uuid, ARRAY['owner', 'admin', 'manager', 'employee'])
                    )
                )
            );

        DROP POLICY IF EXISTS "Managers delete project files" ON storage.objects;
        CREATE POLICY "Managers delete project files"
            ON storage.objects FOR DELETE
            USING (
                bucket_id = 'project-files' AND
                (
                    public.is_superadmin() OR
                    public.has_org_role((storage.foldername(name))[1]::uuid, ARRAY['owner', 'admin', 'manager'])
                )
            );

        -- 3.4 Work Order Photographs
        DROP POLICY IF EXISTS "Read work order photos" ON storage.objects;
        CREATE POLICY "Read work order photos"
            ON storage.objects FOR SELECT
            USING (
                bucket_id = 'work-order-photos' AND
                (
                    public.is_superadmin() OR
                    public.is_member_of((storage.foldername(name))[1]::uuid)
                )
            );

        DROP POLICY IF EXISTS "Staff upload work order photos" ON storage.objects;
        CREATE POLICY "Staff upload work order photos"
            ON storage.objects FOR INSERT
            WITH CHECK (
                bucket_id = 'work-order-photos' AND
                (
                    public.is_superadmin() OR
                    (
                        public.is_member_of((storage.foldername(name))[1]::uuid) AND
                        public.has_org_role((storage.foldername(name))[1]::uuid, ARRAY['owner', 'admin', 'manager', 'employee'])
                    )
                )
            );

        DROP POLICY IF EXISTS "Managers delete work order photos" ON storage.objects;
        CREATE POLICY "Managers delete work order photos"
            ON storage.objects FOR DELETE
            USING (
                bucket_id = 'work-order-photos' AND
                (
                    public.is_superadmin() OR
                    public.has_org_role((storage.foldername(name))[1]::uuid, ARRAY['owner', 'admin', 'manager'])
                )
            );

        -- 3.5 Invoice Documents (Management + Recipient Customer; Regular Employees Blocked)
        DROP POLICY IF EXISTS "Read invoice documents" ON storage.objects;
        CREATE POLICY "Read invoice documents"
            ON storage.objects FOR SELECT
            USING (
                bucket_id = 'invoice-documents' AND
                (
                    public.is_superadmin() OR
                    (
                        public.is_member_of((storage.foldername(name))[1]::uuid) AND
                        (
                            public.has_org_role((storage.foldername(name))[1]::uuid, ARRAY['owner', 'admin', 'manager']) OR
                            (
                                public.has_org_role((storage.foldername(name))[1]::uuid, ARRAY['customer']) AND
                                (storage.foldername(name))[2] = public.get_customer_id((storage.foldername(name))[1]::uuid)::text
                            )
                        )
                    )
                )
            );

        DROP POLICY IF EXISTS "Managers upload invoice documents" ON storage.objects;
        CREATE POLICY "Managers upload invoice documents"
            ON storage.objects FOR INSERT
            WITH CHECK (
                bucket_id = 'invoice-documents' AND
                (
                    public.is_superadmin() OR
                    public.has_org_role((storage.foldername(name))[1]::uuid, ARRAY['owner', 'admin', 'manager'])
                )
            );

        DROP POLICY IF EXISTS "Admins delete invoice documents" ON storage.objects;
        CREATE POLICY "Admins delete invoice documents"
            ON storage.objects FOR DELETE
            USING (
                bucket_id = 'invoice-documents' AND
                (
                    public.is_superadmin() OR
                    public.has_org_role((storage.foldername(name))[1]::uuid, ARRAY['owner', 'admin'])
                )
            );

        -- 3.6 Public Assets (Logos & Branding Avatars)
        DROP POLICY IF EXISTS "Public can view org assets" ON storage.objects;
        CREATE POLICY "Public can view org assets"
            ON storage.objects FOR SELECT
            USING (bucket_id = 'org-assets');

        DROP POLICY IF EXISTS "Tenant Admins manage org assets" ON storage.objects;
        CREATE POLICY "Tenant Admins manage org assets"
            ON storage.objects FOR ALL
            USING (
                bucket_id = 'org-assets' AND
                (
                    public.is_superadmin() OR
                    public.has_org_role((storage.foldername(name))[1]::uuid, ARRAY['owner', 'admin'])
                )
            );

    END IF;
END $$;
