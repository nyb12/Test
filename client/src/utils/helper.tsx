import DOMPurify from 'dompurify';

export const getUserInitials = (user: any) => {
  if (user?.email) {
    return user.email.slice(0, 2).toUpperCase();
  }
  if (user?.phone) {
    return user.phone.slice(-2).toUpperCase();
  }
  return 'U';
};

export const stripHtml = (html: string): string => {
  const clean = DOMPurify.sanitize(html, { ALLOWED_TAGS: [] }); // removes all tags
  const div = document.createElement('div');
  div.innerHTML = clean;
  return div.textContent || div.innerText || '';
};

export const SafeHtml = ({ html }: { html: string }) => {
  const cleanHtml = DOMPurify.sanitize(html);

  return (
    <div
      className="prose prose-sm max-w-none text-gray-800"
      dangerouslySetInnerHTML={{ __html: cleanHtml }}
    />
  );
};

export function truncateTitle(title: string, maxLength: number = 30): string {
  if (title.length <= maxLength) {
    return title;
  }
  return title.substring(0, maxLength) + '...';
}
