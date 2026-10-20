-- Restrict browser writes to user-editable fields only; counters and moderation state remain server-managed.
revoke insert, update, delete on public.threads, public.replies from authenticated;
revoke insert on public.reports from authenticated;

grant insert (lesson_id, author_id, title, body) on public.threads to authenticated;
grant update (title, body, lesson_id) on public.threads to authenticated;
grant delete on public.threads to authenticated;

grant insert (thread_id, author_id, body) on public.replies to authenticated;
grant update (body) on public.replies to authenticated;
grant delete on public.replies to authenticated;

grant insert (target_type, target_id, reporter_id, reason) on public.reports to authenticated;
