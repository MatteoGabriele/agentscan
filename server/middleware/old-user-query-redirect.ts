export default defineEventHandler((event) => {
  const { user } = getQuery(event);
  const url = getRequestURL(event);

  if (user && url.pathname === "/") {
    // Clear the query string by redirecting to the clean URL
    setResponseHeader(event, "location", `/user/${user}`);
    setResponseStatus(event, 301);
  }
});
