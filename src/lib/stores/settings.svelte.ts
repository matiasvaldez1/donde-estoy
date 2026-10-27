import type { Settings } from '../types';
import { defaultSettings, loadSettings, saveSettings } from './persist';

class SettingsStore {
	current = $state<Settings>(defaultSettings());

	load(): void {
		this.current = loadSettings();
	}

	/** La region de arranque: el escalon 1 de la escalera sale de aca. */
	setRegion(regionId: string): void {
		this.current.playerRegionId = regionId;
		saveSettings(this.current);
	}

	setMapLabels(on: boolean): void {
		this.current.mapLabels = on;
		saveSettings(this.current);
	}
}

export const settings = new SettingsStore();
