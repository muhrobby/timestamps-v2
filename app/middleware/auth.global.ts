export default defineNuxtRouteMiddleware((to) => {
  const { isAuthenticated, isLoading } = useAuth();

  // Allow access to login page
  if (to.path === "/login") {
    if (isAuthenticated.value) {
      return navigateTo("/dashboard");
    }
    return;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated.value && !isLoading.value) {
    return navigateTo("/login");
  }
});
