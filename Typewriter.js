import React, { useState, useEffect } from "react";
import './Typewriter.css';

const Typewriter = ({ text, speed = 30 }) => {
    const [displayText, setDisplayText] = useState("");
    const [isTyping, setIsTyping] = useState(true);

    useEffect(() => {
        let i = 0;
        setDisplayText("");
        setIsTyping(true);

        const interval = setInterval(() => {
            setDisplayText(text.slice(0, i + 1));
            i++;
            if (i === text.length) {
                clearInterval(interval);
                setIsTyping(false);
            }
        }, speed);

        return () => clearInterval(interval);
    }, [text, speed]);

    return (
        <span>
            {displayText}
            {isTyping && <span className="cursor"></span>}
        </span>
    );
};

export default Typewriter;
