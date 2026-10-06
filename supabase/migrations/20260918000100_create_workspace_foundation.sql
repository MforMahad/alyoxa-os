-- ============================================================================
-- MIGRATION 037 — WORKSPACE AUTHORIZATION FOUNDATION
-- ============================================================================
-- Extends existing public.workspaces and public.workspace_memberships.
-- Does not recreate either table.
--
-- Identity:
--   auth.users.id
--     →
--   public.users.auth_id
--     →
--   public.users.id
--     →
--   public.workspace_memberships.user_id
--
-- workspace_memberships is the tenant authorization relationship.
-- RLS remains the ultimate tenant isolation boundary.
-- ============================================================================


-- ============================================================================
-- 1. MEMBERSHIP ROLE / STATUS CHECKS
-- ============================================================================

ALTER TABLE public.workspace_memberships
    ADD CONSTRAINT chk_workspace_memberships_role
        CHECK (role IN ('owner', 'admin', 'member'));

ALTER TABLE public.workspace_memberships
    ADD CONSTRAINT chk_workspace_memberships_status
        CHECK (status IN ('active', 'suspended', 'invited'));


-- ============================================================================
-- 2. COMPOSITE UNIQUE KEY FOR FUTURE TENANT FKs
-- ============================================================================
-- Matches the composite parent-key convention established by Migration 034.
-- This is specifically:
--
--   (id, workspace_id)
--
-- NOT UNIQUE(id, id).

CREATE UNIQUE INDEX idx_workspace_memberships_id_workspace_id
    ON public.workspace_memberships (id, workspace_id);


-- ============================================================================
-- 3. CURRENT APPLICATION USER
-- ============================================================================
-- Converts the Supabase Auth identity into the ALYOXA application-user ID.
--
-- auth.uid()
--     ↓
-- public.users.auth_id
--     ↓
-- public.users.id

CREATE FUNCTION public.current_application_user_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT u.id
    FROM public.users u
    WHERE u.auth_id = auth.uid()
    LIMIT 1;
$$;

REVOKE ALL
    ON FUNCTION public.current_application_user_id()
    FROM PUBLIC;

GRANT EXECUTE
    ON FUNCTION public.current_application_user_id()
    TO authenticated;


-- ============================================================================
-- 4. ACTIVE MEMBERSHIP HELPER
-- ============================================================================
-- Used by RLS policies to determine whether the authenticated user has
-- active access to a specific workspace.
--
-- SECURITY DEFINER avoids recursive RLS evaluation against
-- public.workspace_memberships.

CREATE FUNCTION public.is_active_workspace_member(
    p_workspace_id UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.workspace_memberships wm
        WHERE wm.workspace_id = p_workspace_id
          AND wm.user_id = public.current_application_user_id()
          AND wm.status = 'active'
    );
$$;

REVOKE ALL
    ON FUNCTION public.is_active_workspace_member(UUID)
    FROM PUBLIC;

GRANT EXECUTE
    ON FUNCTION public.is_active_workspace_member(UUID)
    TO authenticated;


-- ============================================================================
-- 5. WORKSPACE ROLE HELPER
-- ============================================================================
-- Checks whether the authenticated application user has one of the supplied
-- active roles inside the specified workspace.

CREATE FUNCTION public.has_workspace_role(
    p_workspace_id UUID,
    p_roles TEXT[]
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.workspace_memberships wm
        WHERE wm.workspace_id = p_workspace_id
          AND wm.user_id = public.current_application_user_id()
          AND wm.status = 'active'
          AND wm.role = ANY (p_roles)
    );
$$;

REVOKE ALL
    ON FUNCTION public.has_workspace_role(UUID, TEXT[])
    FROM PUBLIC;

GRANT EXECUTE
    ON FUNCTION public.has_workspace_role(UUID, TEXT[])
    TO authenticated;


-- ============================================================================
-- 6. PERSONAL WORKSPACE OWNER BOOTSTRAP HELPER
-- ============================================================================
-- Returns TRUE only when:
--
--   • the workspace exists
--   • it is a personal workspace
--   • it has an owner
--   • that owner is the current ALYOXA application user
--   • the workspace currently has zero memberships
--
-- Used only for:
--   • first OWNER membership bootstrap
--   • INSERT ... RETURNING visibility for the newly created workspace
--
-- This is intentionally NOT a generic membership-count probe.

CREATE FUNCTION public.can_bootstrap_personal_workspace_owner(
    p_workspace_id UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.workspaces w
        WHERE w.id = p_workspace_id
          AND w.organization_id IS NULL
          AND w.owner_user_id IS NOT NULL
          AND w.owner_user_id = public.current_application_user_id()
          AND NOT EXISTS (
              SELECT 1
              FROM public.workspace_memberships wm
              WHERE wm.workspace_id = p_workspace_id
          )
    );
$$;

REVOKE ALL
    ON FUNCTION public.can_bootstrap_personal_workspace_owner(UUID)
    FROM PUBLIC;

GRANT EXECUTE
    ON FUNCTION public.can_bootstrap_personal_workspace_owner(UUID)
    TO authenticated;


-- ============================================================================
-- 7. BLOCK NORMAL WORKSPACE OWNERSHIP / ORGANIZATION TRANSFER
-- ============================================================================
-- Ownership transfer is deliberately NOT part of ordinary workspace UPDATE.
-- It will later be handled by a dedicated explicit action.
--
-- organization_id is also immutable through normal UPDATE so a workspace
-- cannot be switched between personal and organization ownership casually.

CREATE FUNCTION public.prevent_workspace_ownership_change()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SET search_path = public
AS $$
BEGIN

    IF NEW.owner_user_id IS DISTINCT FROM OLD.owner_user_id THEN
        RAISE EXCEPTION
            'Workspace owner_user_id cannot be changed through a normal update';
    END IF;

    IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
        RAISE EXCEPTION
            'Workspace organization_id cannot be changed through a normal update';
    END IF;

    RETURN NEW;

END;
$$;

CREATE TRIGGER trg_workspaces_prevent_ownership_change
    BEFORE UPDATE ON public.workspaces
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_workspace_ownership_change();


-- ============================================================================
-- 8. BLOCK MEMBERSHIP IDENTITY REASSIGNMENT
-- ============================================================================
-- A membership belongs permanently to its original:
--
--   workspace_id
--   user_id
--
-- Changing either requires a dedicated membership operation rather than a
-- normal UPDATE.

CREATE FUNCTION public.prevent_workspace_membership_identity_change()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SET search_path = public
AS $$
BEGIN

    IF NEW.workspace_id IS DISTINCT FROM OLD.workspace_id THEN
        RAISE EXCEPTION
            'Workspace membership workspace_id cannot be changed';
    END IF;

    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
        RAISE EXCEPTION
            'Workspace membership user_id cannot be changed';
    END IF;

    RETURN NEW;

END;
$$;

CREATE TRIGGER trg_workspace_memberships_prevent_identity_change
    BEFORE UPDATE ON public.workspace_memberships
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_workspace_membership_identity_change();


-- ============================================================================
-- 9. TABLE PRIVILEGES
-- ============================================================================
-- RLS remains the enforcement layer.
-- authenticated receives DML privileges.
-- anon receives none.

GRANT SELECT, INSERT, UPDATE, DELETE
    ON TABLE public.workspaces
    TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
    ON TABLE public.workspace_memberships
    TO authenticated;


-- ============================================================================
-- 10. WORKSPACE SELECT
-- ============================================================================
-- Normal access requires active workspace membership.
--
-- During personal workspace creation, the creator can also see the workspace
-- while it is still empty so that INSERT ... RETURNING can succeed and the
-- first OWNER membership can be created.

CREATE POLICY workspaces_select_policy
ON public.workspaces
FOR SELECT
TO authenticated
USING (
    public.is_active_workspace_member(id)
    OR public.can_bootstrap_personal_workspace_owner(id)
);


-- ============================================================================
-- 11. WORKSPACE INSERT
-- ============================================================================
-- Migration 037 supports personal workspace creation only.
--
-- Organization-owned workspace creation remains outside this migration.

CREATE POLICY workspaces_insert_policy
ON public.workspaces
FOR INSERT
TO authenticated
WITH CHECK (
    organization_id IS NULL
    AND owner_user_id IS NOT NULL
    AND owner_user_id = public.current_application_user_id()
    AND status = 'active'
);


-- ============================================================================
-- 12. WORKSPACE UPDATE
-- ============================================================================
-- Active OWNER or ADMIN may update normal workspace fields.
--
-- Ownership / organization changes are blocked separately by trigger.

CREATE POLICY workspaces_update_policy
ON public.workspaces
FOR UPDATE
TO authenticated
USING (
    public.has_workspace_role(
        id,
        ARRAY['owner', 'admin']
    )
)
WITH CHECK (
    public.has_workspace_role(
        id,
        ARRAY['owner', 'admin']
    )
);


-- ============================================================================
-- 13. WORKSPACE DELETE
-- ============================================================================
-- Only an active OWNER may request workspace deletion.
--
-- Existing foreign-key constraints still determine whether deletion can
-- actually complete.

CREATE POLICY workspaces_delete_policy
ON public.workspaces
FOR DELETE
TO authenticated
USING (
    public.has_workspace_role(
        id,
        ARRAY['owner']
    )
);


-- ============================================================================
-- 14. MEMBERSHIP SELECT
-- ============================================================================
-- A user may:
--
--   • see their own membership row
--   • see membership rows inside any workspace where they have active
--     membership
--
-- Suspended / invited users therefore retain visibility of their own
-- membership row but do not gain workspace access.

CREATE POLICY workspace_memberships_select_policy
ON public.workspace_memberships
FOR SELECT
TO authenticated
USING (
    user_id = public.current_application_user_id()
    OR public.is_active_workspace_member(workspace_id)
);


-- ============================================================================
-- 15. FIRST OWNER BOOTSTRAP
-- ============================================================================
-- The creator of an empty personal workspace may create exactly one OWNER
-- membership for themselves.

CREATE POLICY workspace_memberships_bootstrap_owner_insert_policy
ON public.workspace_memberships
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = public.current_application_user_id()
    AND role = 'owner'
    AND status = 'active'
    AND public.can_bootstrap_personal_workspace_owner(workspace_id)
);


-- ============================================================================
-- 16. OWNER ADDING ADMIN / MEMBER
-- ============================================================================
-- An active OWNER can add ADMIN or MEMBER memberships.
--
-- OWNER creation is intentionally excluded from the normal path.

CREATE POLICY workspace_memberships_owner_insert_policy
ON public.workspace_memberships
FOR INSERT
TO authenticated
WITH CHECK (
    public.has_workspace_role(
        workspace_id,
        ARRAY['owner']
    )
    AND role IN ('admin', 'member')
);


-- ============================================================================
-- 17. ADMIN ADDING MEMBER
-- ============================================================================
-- ADMIN can add MEMBER only.
--
-- ADMIN cannot manufacture OWNER or ADMIN memberships.

CREATE POLICY workspace_memberships_admin_insert_policy
ON public.workspace_memberships
FOR INSERT
TO authenticated
WITH CHECK (
    public.has_workspace_role(
        workspace_id,
        ARRAY['admin']
    )
    AND role = 'member'
);


-- ============================================================================
-- 18. OWNER UPDATING NON-OWNER MEMBERS
-- ============================================================================
-- OWNER may modify ADMIN / MEMBER membership records.
--
-- OWNER membership itself is protected from normal UPDATE.
-- OWNER cannot use this policy to manufacture another OWNER role.

CREATE POLICY workspace_memberships_owner_update_policy
ON public.workspace_memberships
FOR UPDATE
TO authenticated
USING (
    public.has_workspace_role(
        workspace_id,
        ARRAY['owner']
    )
    AND role <> 'owner'
)
WITH CHECK (
    public.has_workspace_role(
        workspace_id,
        ARRAY['owner']
    )
    AND role IN ('admin', 'member')
);


-- ============================================================================
-- 19. ADMIN UPDATING MEMBER MEMBERSHIPS
-- ============================================================================
-- IMPORTANT:
-- ADMIN can ONLY update rows whose role is currently MEMBER and whose
-- resulting role remains MEMBER.
--
-- This prevents:
--
--   ADMIN → MEMBER → ADMIN
--
-- privilege escalation.

CREATE POLICY workspace_memberships_admin_update_policy
ON public.workspace_memberships
FOR UPDATE
TO authenticated
USING (
    public.has_workspace_role(
        workspace_id,
        ARRAY['admin']
    )
    AND role = 'member'
)
WITH CHECK (
    public.has_workspace_role(
        workspace_id,
        ARRAY['admin']
    )
    AND role = 'member'
);


-- ============================================================================
-- 20. OWNER DELETING NON-OWNER MEMBERS
-- ============================================================================
-- OWNER may remove ADMIN / MEMBER memberships.
-- OWNER membership cannot be deleted through this policy.

CREATE POLICY workspace_memberships_owner_delete_policy
ON public.workspace_memberships
FOR DELETE
TO authenticated
USING (
    public.has_workspace_role(
        workspace_id,
        ARRAY['owner']
    )
    AND role <> 'owner'
);


-- ============================================================================
-- 21. ADMIN DELETING MEMBER MEMBERSHIPS
-- ============================================================================
-- ADMIN can delete MEMBER rows only.
--
-- ADMIN cannot delete OWNER or ADMIN memberships.

CREATE POLICY workspace_memberships_admin_delete_policy
ON public.workspace_memberships
FOR DELETE
TO authenticated
USING (
    public.has_workspace_role(
        workspace_id,
        ARRAY['admin']
    )
    AND role = 'member'
);