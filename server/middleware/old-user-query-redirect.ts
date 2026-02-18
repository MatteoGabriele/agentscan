export default defineEventHandler((event) => {
  const { user } = getQuery(event);
  const url = getRequestURL(event);

  if (user && url.pathname === "/") {
    return sendRedirect(event, `/user/${user}`, 301);
  }
});
