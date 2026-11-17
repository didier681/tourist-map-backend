// Interfaz que define la estructura del payload del JWT
export interface JwtPayload {
  sub: number;      // ID del usuario
  email: string;    // Email del usuario
  role: string;     // Rol del usuario
  tokenUse?: 'refresh'; // Distingue refresh tokens para no aceptarlos como access tokens.
}