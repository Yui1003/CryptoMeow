
import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { FarmScene } from '../scenes/FarmScene';

interface GameEngineProps {
  farmData: any;
  onCatClick?: (catData: any) => void;
  onClaimCoins?: () => void;
}

export default function GameEngine({ farmData, onCatClick, onClaimCoins }: GameEngineProps) {
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserGameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!gameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 1200,
      height: 800,
      parent: gameRef.current,
      backgroundColor: '#2c5f41',
      scene: [FarmScene],
      audio: {
        disableWebAudio: true
      },
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 0 },
          debug: false
        }
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
      }
    };

    phaserGameRef.current = new Phaser.Game(config);

    // Wait for scene to be ready and pass React callbacks
    const setupScene = () => {
      const scene = phaserGameRef.current?.scene.getScene('FarmScene') as FarmScene;
      if (scene) {
        console.log('Setting up scene with callbacks and farm data');
        scene.setCallbacks({ onCatClick, onClaimCoins });
        if (farmData) {
          scene.updateFarmData(farmData);
        }
      }
    };

    // Try immediate setup
    setTimeout(() => {
      setupScene();
    }, 100);

    // Also listen for scene ready event as backup
    phaserGameRef.current.scene.getScene('FarmScene')?.scene.events.once('create', () => {
      console.log('Scene create event fired');
      setTimeout(setupScene, 50);
    });

    return () => {
      if (phaserGameRef.current) {
        phaserGameRef.current.destroy(true);
        phaserGameRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (phaserGameRef.current) {
      const scene = phaserGameRef.current.scene.getScene('FarmScene') as FarmScene;
      if (scene) {
        scene.updateFarmData(farmData);
      }
    }
  }, [farmData]);

  return (
    <div 
      ref={gameRef} 
      className="w-full h-full rounded-lg overflow-hidden border-2 border-crypto-pink/30"
      style={{ minHeight: '600px' }}
    />
  );
}
