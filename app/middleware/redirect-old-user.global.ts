export default defineNuxtRouteMiddleware((to) => {
  const user = to.query.user;

  if (user && to.path === "/") {
    return navigateTo(`/user/${user}`, { redirectCode: 301, replace: true });
  }
});
