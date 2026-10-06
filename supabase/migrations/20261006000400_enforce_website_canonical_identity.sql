-- Keep website identity canonical even for direct authenticated table writes.
-- RLS remains responsible for deciding who may write each workspace row.

CREATE OR REPLACE FUNCTION public.enforce_website_canonical_identity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_canonical_url TEXT;
    v_normalized_domain VARCHAR(255);
    v_scheme TEXT;
BEGIN
    SELECT canonical.canonical_url, canonical.normalized_domain
    INTO v_canonical_url, v_normalized_domain
    FROM public.canonicalize_website_url(NEW.entry_url) AS canonical;

    IF NEW.normalized_domain IS DISTINCT FROM v_normalized_domain THEN
        RAISE EXCEPTION
            'normalized_domain must match the canonical hostname derived from entry_url';
    END IF;

    v_scheme := split_part(v_canonical_url, '://', 1);
    NEW.entry_url := v_scheme || '://' || v_normalized_domain || '/';
    NEW.normalized_domain := v_normalized_domain;

    RETURN NEW;
END;
$$;

REVOKE ALL
ON FUNCTION public.enforce_website_canonical_identity()
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.enforce_website_canonical_identity()
TO authenticated;

CREATE TRIGGER trg_websites_canonical_identity
BEFORE INSERT OR UPDATE
ON public.websites
FOR EACH ROW
EXECUTE FUNCTION public.enforce_website_canonical_identity();
