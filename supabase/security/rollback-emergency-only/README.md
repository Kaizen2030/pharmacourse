# Undo files: do not run these normally

Every database step has an undo file here. You never need them for setup.
Use one only if a step causes a problem and you want to remove it again; then run the undo file with the same name.

To set up the site, run the files in the folder above (`supabase/security`), not these.
