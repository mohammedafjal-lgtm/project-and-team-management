export type FormErrors = Record<string, string[] | undefined>;

export function FormError({ errors, field }: { errors: FormErrors; field: string }) {
  const err = errors[field];
  if (!err || err.length === 0) return null;
  return <p className="text-xs text-destructive mt-1 font-medium">{err[0]}</p>;
}