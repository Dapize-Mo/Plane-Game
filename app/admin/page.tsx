'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  GameSettings,
  defaultSettings,
  loadSettings,
  saveSettings,
  resetSettings,
} from '@/lib/settings';

interface SettingSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
}

function SettingSlider({ label, value, min, max, step, unit, onChange }: SettingSliderProps) {
  return (
    <div className="mb-4">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-neutral-400 tracking-wider uppercase">{label}</span>
        <span className="text-neutral-300">
          {value}{unit && <span className="text-neutral-600 ml-1">{unit}</span>}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1 bg-neutral-800 rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
          [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:cursor-pointer"
      />
    </div>
  );
}

interface SettingToggleProps {
  label: string;
  description?: string;
  value: boolean;
  badge?: string;
  onChange: (v: boolean) => void;
}

function SettingToggle({ label, description, value, badge, onChange }: SettingToggleProps) {
  return (
    <div
      className="flex items-center justify-between mb-4 p-3 rounded border border-neutral-800 hover:border-neutral-700 transition-colors cursor-pointer"
      onClick={() => onChange(!value)}
    >
      <div>
        <div className="text-sm text-neutral-300 flex items-center gap-2">
          {label}
          {badge && (
            <span className="text-[10px] px-1.5 py-0.5 bg-neutral-800 text-neutral-500 rounded uppercase tracking-wider">
              {badge}
            </span>
          )}
        </div>
        {description && (
          <div className="text-xs text-neutral-600 mt-0.5">{description}</div>
        )}
      </div>
      <div
        className={`w-8 h-4 rounded-full transition-colors relative ${
          value ? 'bg-white' : 'bg-neutral-700'
        }`}
      >
        <div
          className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${
            value ? 'left-4 bg-black' : 'left-0.5 bg-neutral-500'
          }`}
        />
      </div>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<GameSettings>(defaultSettings);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const update = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => {
    setSettings((s) => ({ ...s, [key]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    const defaults = resetSettings();
    setSettings(defaults);
    setSaved(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-y-auto">
      {/* Header */}
      <header className="border-b border-neutral-800 px-6 py-4 flex items-center justify-between sticky top-0 bg-[#0a0a0a]/95 backdrop-blur z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/')}
            className="text-neutral-500 hover:text-white transition-colors text-xs tracking-wider"
          >
            ← Back
          </button>
          <h1 className="text-sm tracking-[0.3em] uppercase text-neutral-300">
            Admin Panel
          </h1>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleReset}
            className="text-xs px-3 py-1.5 border border-neutral-700 text-neutral-500 hover:text-white hover:border-neutral-500 rounded transition-colors tracking-wider uppercase"
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            className={`text-xs px-4 py-1.5 rounded tracking-wider uppercase transition-all ${
              saved
                ? 'bg-green-900/50 text-green-400 border border-green-800'
                : 'bg-white text-black hover:bg-neutral-200'
            }`}
          >
            {saved ? 'Saved!' : 'Save'}
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* World Settings */}
        <section className="mb-10">
          <h2 className="text-xs tracking-[0.3em] uppercase text-neutral-500 mb-4 pb-2 border-b border-neutral-800">
            World
          </h2>

          <SettingToggle
            label="Spherical World"
            description="Fly straight and return to spawn. No walls."
            value={settings.sphericalWorld}
            onChange={(v) => update('sphericalWorld', v)}
          />

          <SettingSlider
            label="World Radius"
            value={settings.worldRadius}
            min={500}
            max={5000}
            step={100}
            unit="units"
            onChange={(v) => update('worldRadius', v)}
          />

          <SettingSlider
            label="Terrain Height"
            value={settings.terrainAmplitude}
            min={20}
            max={200}
            step={5}
            unit="max"
            onChange={(v) => update('terrainAmplitude', v)}
          />

          <SettingSlider
            label="Sea Level"
            value={settings.seaLevel}
            min={-20}
            max={30}
            step={1}
            onChange={(v) => update('seaLevel', v)}
          />
        </section>

        {/* Rendering */}
        <section className="mb-10">
          <h2 className="text-xs tracking-[0.3em] uppercase text-neutral-500 mb-4 pb-2 border-b border-neutral-800">
            Rendering
          </h2>

          <SettingSlider
            label="Particle Spacing"
            value={settings.particleSpacing}
            min={4}
            max={16}
            step={1}
            unit="units"
            onChange={(v) => update('particleSpacing', v)}
          />

          <SettingSlider
            label="Render Distance"
            value={settings.renderDistance}
            min={200}
            max={1000}
            step={50}
            unit="units"
            onChange={(v) => update('renderDistance', v)}
          />

          <SettingSlider
            label="Fog Distance"
            value={settings.fogDistance}
            min={200}
            max={1200}
            step={50}
            unit="units"
            onChange={(v) => update('fogDistance', v)}
          />

          <SettingSlider
            label="Particle Size"
            value={settings.particleSize}
            min={1}
            max={8}
            step={0.5}
            onChange={(v) => update('particleSize', v)}
          />
        </section>

        {/* Gameplay */}
        <section className="mb-10">
          <h2 className="text-xs tracking-[0.3em] uppercase text-neutral-500 mb-4 pb-2 border-b border-neutral-800">
            Gameplay
          </h2>

          <SettingToggle
            label="Fuel System"
            description="Planes consume fuel. Land at airports to refuel."
            value={settings.fuelEnabled}
            badge="Beta"
            onChange={(v) => update('fuelEnabled', v)}
          />

          {settings.fuelEnabled && (
            <>
              <SettingSlider
                label="Fuel Capacity"
                value={settings.fuelCapacity}
                min={50}
                max={500}
                step={10}
                unit="gal"
                onChange={(v) => update('fuelCapacity', v)}
              />

              <SettingSlider
                label="Consumption Rate"
                value={settings.fuelConsumptionRate}
                min={0.5}
                max={10}
                step={0.5}
                unit="gal/s"
                onChange={(v) => update('fuelConsumptionRate', v)}
              />

              <SettingToggle
                label="Auto-refuel on Ground"
                description="Automatically refuel when grounded at an airport"
                value={settings.fuelRegenOnGround}
                onChange={(v) => update('fuelRegenOnGround', v)}
              />
            </>
          )}
        </section>

        {/* Camera */}
        <section className="mb-10">
          <h2 className="text-xs tracking-[0.3em] uppercase text-neutral-500 mb-4 pb-2 border-b border-neutral-800">
            Camera
          </h2>

          <SettingSlider
            label="Camera Distance"
            value={settings.cameraDistance}
            min={10}
            max={50}
            step={1}
            onChange={(v) => update('cameraDistance', v)}
          />

          <SettingSlider
            label="Camera Height"
            value={settings.cameraHeight}
            min={2}
            max={20}
            step={1}
            onChange={(v) => update('cameraHeight', v)}
          />

          <SettingSlider
            label="Camera Smoothness"
            value={settings.cameraSmoothness}
            min={0.01}
            max={0.15}
            step={0.01}
            onChange={(v) => update('cameraSmoothness', v)}
          />
        </section>

        {/* Info */}
        <section className="text-xs text-neutral-600 border-t border-neutral-800 pt-4">
          <p>Changes apply on next game load. Some settings may affect performance.</p>
          <p className="mt-1">Press V in-game to toggle space view.</p>
        </section>
      </div>
    </div>
  );
}
