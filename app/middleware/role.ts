import type { UserRole } from "~/types";

export default defineNuxtRouteMiddleware((to) => {
  const { user } = useAuth();

  const requiredRole = to.meta.requiredRole as UserRole[] | undefined;

  if (requiredRole && user.value) {
    if (!requiredRole.includes(user.value.role)) {
      return navigateTo("/dashboard");
    }
  }
});
