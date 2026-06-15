import React, { useState } from 'react';
import { resolveImageUrl } from '../../utils/imageUrl';
import { useAppSelector } from '../../store';

interface UserAvatarProps {
  src?: string | null;
  name?: string;
  size?: number;
  className?: string;
  userId?: string | number;
}

/**
 * Deterministic background color based on name string.
 * Returns a soft, professional HSL color.
 */
const getInitialsColor = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 55%)`;
};

/**
 * Extract up to 2 initials from a user's name.
 */
const getInitials = (name: string): string => {
  if (!name || !name.trim()) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/**
 * UserAvatar: A smart avatar component.
 * - Shows the user's uploaded image if `src` is a valid, non-empty URL.
 * - Falls back to a deterministic initials-based avatar using the user's name.
 * - Handles broken image loads gracefully by switching to the initials fallback.
 */
const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  name = '',
  size = 48,
  className = '',
  userId,
}) => {
  const [imgError, setImgError] = useState(false);
  const { user } = useAppSelector(state => state.auth);

  // If the avatar belongs to the currently logged-in user, use their latest avatar source
  let finalSrc = src;
  if (user) {
    const isSameId = userId && (String(userId) === String(user.id) || String(userId) === String(user._id));
    const isSameName =
      name && (
        name.trim().toLowerCase() === String(user.full_name || '').trim().toLowerCase() ||
        name.trim().toLowerCase() === String(user.username || '').trim().toLowerCase()
      );
    if (isSameId || isSameName) {
      if (user.avatar) {
        finalSrc = user.avatar;
      }
    }
  }

  // Determine if we have a usable image source
  const resolvedSrc = finalSrc ? resolveImageUrl(finalSrc) : '';
  const hasValidSrc =
    !!resolvedSrc &&
    resolvedSrc !== 'null' &&
    resolvedSrc !== 'undefined' &&
    !resolvedSrc.includes('pravatar.cc') && // Explicitly reject legacy placeholder
    !imgError;

  const initials = getInitials(name);
  const bgColor = getInitialsColor(name || 'User');

  const commonStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  };

  if (hasValidSrc) {
    return (
      <div
        className={className}
        style={commonStyle}
        aria-label={`Avatar of ${name || 'User'}`}
      >
        <img
          src={resolvedSrc}
          alt={name || 'User avatar'}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={() => setImgError(true)}
          loading="lazy"
        />
      </div>
    );
  }

  // Initials fallback
  return (
    <div
      className={className}
      style={{
        ...commonStyle,
        backgroundColor: bgColor,
        color: '#fff',
        fontWeight: 700,
        fontSize: Math.max(12, Math.round(size * 0.38)),
        letterSpacing: '0.5px',
        userSelect: 'none',
      }}
      aria-label={`Avatar of ${name || 'User'}`}
    >
      {initials}
    </div>
  );
};

export default UserAvatar;
