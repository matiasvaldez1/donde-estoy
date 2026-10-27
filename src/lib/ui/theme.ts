/**
 * Lee los tokens de @theme en runtime. Leaflet se configura por JS, así que sin
 * esto los colores del mapa quedan hardcodeados y se desincronizan del tema
 * en cuanto alguien toca la paleta.
 */
export function themeColor(token: string, fallback: string): string {
	if (typeof document === 'undefined') return fallback;
	const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
	return value || fallback;
}

export const mapColors = () => ({
	ink: themeColor('--color-bg-primary', '#0f0f0f'),
	truth: themeColor('--color-accent', '#4ade80'),
	guess: themeColor('--color-text-primary', '#e5e5e5'),
	line: themeColor('--color-warning', '#f7d51d')
});
