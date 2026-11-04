-- OpsPilot PostgreSQL Schema Migration: 003_storage_and_audit.sql
-- Description: Supabase Storage Buckets configuration and Multi-Tenant Isolation Policies

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
        
        -- Create buckets if not already present
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES 
            ('org-assets', 'org-assets', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']),
            ('org-documents', 'org-documents', false, 52428800, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg'])
        ON CONFLICT (id) DO NOTHING;

        -- Enable RLS on storage.objects
        ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

        -- Document Storage Isolation:
        -- Objects stored with prefix: <organization_id>/<category>/<file_path>
        DROP POLICY IF EXISTS "Tenant Members can read tenant documents" ON storage.objects;
        CREATE POLICY "Tenant Members can read tenant documents"
            ON storage.objects FOR SELECT
            USING (
                bucket_id = 'org-documents' AND
                (storage.foldername(name))[1]::uuid IN (
                    SELECT organization_id 
                    FROM public.organization_members 
                    WHERE user_id = auth.uid() AND status = 'active'
                )
            );

        DROP POLICY IF EXISTS "Tenant Managers can upload tenant documents" ON storage.objects;
        CREATE POLICY "Tenant Managers can upload tenant documents"
            ON storage.objects FOR INSERT
            WITH CHECK (
                bucket_id = 'org-documents' AND
                (storage.foldername(name))[1]::uuid IN (
                    SELECT organization_id 
                    FROM public.organization_members 
                    WHERE user_id = auth.uid() 
                      AND status = 'active' 
                      AND role IN ('owner', 'admin', 'manager')
                )
            );

        -- Public assets (logos, avatars): read allowed for all authenticated/public
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
                    FROM public.organization_members 
                    WHERE user_id = auth.uid() 
                      AND status = 'active' 
                      AND role IN ('owner', 'admin')
                )
            );
    END IF;
END $$;
