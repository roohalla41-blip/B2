import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';

export default function IconCard({ icon: Icon, label, path, color, bgColor, disabled, disabledMessage }) {
  const navigate = useNavigate();

  return (
    <motion.button
      whileTap={{ scale: disabled ? 1 : 0.92 }}
      whileHover={{ y: disabled ? 0 : -3 }}
      onClick={() => !disabled && path && navigate(path)}
      className={`relative flex flex-col items-center justify-center gap-2 aspect-square rounded-2xl border p-3 transition-all w-full ${
        disabled
          ? 'bg-muted border-border opacity-60 cursor-not-allowed'
          : 'bg-card border-border hover:shadow-md hover:border-primary/30'
      }`}
    >
      <div
        className={`w-12 h-12 rounded-2xl flex items-center justify-center ${disabled ? 'bg-muted' : ''}`}
        style={!disabled ? { backgroundColor: bgColor || 'hsl(var(--muted))' } : {}}
      >
        {typeof Icon === 'string' ? (
          <span className="text-2xl">{Icon}</span>
        ) : (
          <Icon className={`w-6 h-6 ${disabled ? 'text-muted-foreground' : ''}`} style={!disabled ? { color } : {}} />
        )}
      </div>
      <span className={`text-xs font-medium text-center leading-tight ${disabled ? 'text-muted-foreground' : 'text-foreground'}`}>{label}</span>
      {disabled && (
        <div className="absolute top-1 end-1">
          <Lock className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
      )}
    </motion.button>
  );
}