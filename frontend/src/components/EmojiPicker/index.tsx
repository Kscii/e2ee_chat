import React from 'react';
import './style.css';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
}

const EmojiPicker: React.FC<EmojiPickerProps> = ({ onEmojiSelect }) => {
  // 使用一个更精简的表情集合，包含最常用的表情
  const emojis = [
    '👍', '👎', '😊', '😂', '❤️',
    '😭', '🎉', '🔥', '✨', '🙏',
    '💪', '👀', '💯', '🤔', '👌'
  ];

  return (
    <div className="emoji-picker">
      {emojis.map(emoji => (
        <span 
          key={emoji} 
          className="emoji-item" 
          onClick={() => onEmojiSelect(emoji)}
        >
          {emoji}
        </span>
      ))}
    </div>
  );
};

export default EmojiPicker; 