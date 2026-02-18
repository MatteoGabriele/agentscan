export default defineNuxtRouteMiddleware((to) => {
  const user = to.query.user;

  if (user && to.path === "/") {
    return navigateTo(
      { path: `/user/${user}`, query: {} },
      { redirectCode: 301, replace: true },
    );
  }
});
