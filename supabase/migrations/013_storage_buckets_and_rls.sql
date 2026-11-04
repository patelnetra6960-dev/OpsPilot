-- OpsPilot PostgreSQL Schema Migration: 013_storage_buckets_and_rls.sql
-- Description: Supabase Storage Buckets Configuration & Multi-Tenant Partitioning Policies

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
        
        -- 1. Create Storage Buckets
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES 
            (
                'org-assets', 
                'org-assets', 
                true, 
                5242880, -- 5 MB
                ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
            ),
            (
                'org-documents', 
                'org-documents', 
                false, 
                52428800, -- 50 MB
                ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg']
            ),
            (
                'work-order-photos', 
                'work-order-photos', 
                false, 
                26214400, -- 25 MB
                ARRAY['image/png', 'image/jpeg', 'image/webp']
            )
        ON CONFLICT (id) DO NOTHING;

        -- 2. Enable RLS on storage.objects
        ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

        -- 3. Document Storage Isolation:
        -- Folder prefix convention: <organization_id>/<category>/<file_name>
        DROP POLICY IF EXISTS "Tenant Members can read tenant documents" ON storage.objects;
        CREATE POLICY "Tenant Members can read tenant documents"
            ON storage.objects FOR SELECT
            USING (
                bucket_id IN ('org-documents', 'work-order-photos') AND
                (storage.foldername(name))[1]::uuid IN (
                    SELECT organization_id 
                    FROM public.organization_memberships 
                    WHERE user_id = auth.uid() AND status = 'active'
                )
            );

        DROP POLICY IF EXISTS "Tenant Managers can upload tenant documents" ON storage.objects;
        CREATE POLICY "Tenant Managers can upload tenant documents"
            ON storage.objects FOR INSERT
            WITH CHECK (
                bucket_id IN ('org-documents', 'work-order-photos') AND
                (storage.foldername(name))[1]::uuid IN (
                    SELECT organization_id 
                    FROM public.organization_memberships 
                    WHERE user_id = auth.uid() 
                      AND status = 'active' 
                      AND role IN ('owner', 'admin', 'manager', 'employee')
                )
            );

        -- 4. Public Assets (Logos & Avatars)
        DROP POLICY IF EXISTS "Public can view org assets" ON storage.objects;
        CREATE POLICY "Public can view org assets"
            ON storage.objects FOR SELECT
            USING (bucket_id = 'org-assets');

        DROP POLICY IF EXISTS "Tenant Admins can manage org assets" ON storage.objects;
        CREATE POLICY "Tenant Admins can manage org assets"
            ON storage.objects FOR ALL
            USING (
                bucket_id = 'org-assets' AND
                (storage.foldername(name))[1]::uuid IN (
                    SELECT organization_id 
                    FROM public.organization_memberships 
                    WHERE user_id = auth.uid() 
                      AND status = 'active' 
                      AND role IN ('owner', 'admin')
                )
            );
    END IF;
END $$;
