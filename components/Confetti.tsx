import { useEffect, useMemo } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSequence,
    withSpring,
    withTiming,
} from "react-native-reanimated";

const CONFETTI_COLORS = ["#F59E0B", "#FBBF24", "#FCD34D", "#FDE68A", "#FFFFFF", "#FB923C"];
const PARTICLE_COUNT = 48;
const BURST_DURATION = 260;
const FALL_DURATION = 950;
const TEXT_LABEL = "ماشاءاللہ";
const TEXT_HOLD_DURATION = 900;

const randomIn = (min: number, max: number) => min + Math.random() * (max - min);

type ParticleConfig = {
    x: number;
    y: number;
    angle: number;
    burstDistance: number;
    fallDistance: number;
    spin: number;
    size: number;
    color: string;
    circle: boolean;
    delay: number;
};

type ParticleProps = {
    config: ParticleConfig;
};

function Particle({ config }: ParticleProps) {
    const tx = useSharedValue(0);
    const ty = useSharedValue(0);
    const rot = useSharedValue(0);
    const opacity = useSharedValue(1);

    useEffect(() => {
        const burstX = Math.cos(config.angle) * config.burstDistance;
        const burstY = Math.sin(config.angle) * config.burstDistance * 0.6 - config.burstDistance * 0.55;
        const fallX = burstX * 1.5;
        const fallY = config.burstDistance * 0.55 + config.fallDistance;

        tx.value = withDelay(
            config.delay,
            withSequence(
                withTiming(burstX, { duration: BURST_DURATION, easing: Easing.out(Easing.quad) }),
                withTiming(fallX, { duration: FALL_DURATION, easing: Easing.in(Easing.quad) }),
            ),
        );
        ty.value = withDelay(
            config.delay,
            withSequence(
                withTiming(burstY, { duration: BURST_DURATION, easing: Easing.out(Easing.quad) }),
                withTiming(fallY, { duration: FALL_DURATION, easing: Easing.in(Easing.quad) }),
            ),
        );
        rot.value = withDelay(
            config.delay,
            withTiming(config.spin, { duration: BURST_DURATION + FALL_DURATION, easing: Easing.linear }),
        );
        opacity.value = withDelay(
            config.delay,
            withSequence(
                withTiming(1, { duration: 150 }),
                withTiming(0, { duration: FALL_DURATION, easing: Easing.out(Easing.quad) }),
            ),
        );
    }, [config, tx, ty, rot, opacity]);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [
            { translateX: tx.value },
            { translateY: ty.value },
            { rotate: `${rot.value}deg` },
        ],
    }));

    return (
        <Animated.View
            style={[
                styles.particle,
                {
                    width: config.size,
                    height: config.size,
                    left: config.x,
                    top: config.y,
                    backgroundColor: config.color,
                    borderRadius: config.circle ? config.size / 2 : 2,
                },
                animatedStyle,
            ]}
        />
    );
}

type ConfettiTextProps = {
    x: number;
    y: number;
    textWidth: number;
    textHeight: number;
};

function ConfettiText({ x, y, textWidth, textHeight }: ConfettiTextProps) {
    const scale = useSharedValue(0);
    const opacity = useSharedValue(0);

    useEffect(() => {
        scale.value = withDelay(
            60,
            withSequence(
                withSpring(1, { damping: 9, stiffness: 160 }),
                withDelay(TEXT_HOLD_DURATION, withTiming(1.15, { duration: 200, easing: Easing.out(Easing.quad) })),
            ),
        );
        opacity.value = withDelay(
            60,
            withSequence(
                withTiming(1, { duration: 120 }),
                withDelay(TEXT_HOLD_DURATION, withTiming(0, { duration: 250, easing: Easing.out(Easing.quad) })),
            ),
        );
    }, [scale, opacity]);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ translateY: -2 }, { scale: scale.value }],
    }));

    return (
        <Animated.Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
            style={[styles.confettiText, { left: x - textWidth / 2, top: y - textHeight / 2, width: textWidth }, animatedStyle]}
        >
            {TEXT_LABEL}
        </Animated.Text>
    );
}

type ConfettiProps = {
    onDone?: () => void;
};

export function Confetti({ onDone }: ConfettiProps) {
    const { width, height } = useWindowDimensions();

    const particles = useMemo<ParticleConfig[]>(() => {
        const originX = width / 2;
        const originY = height * 0.42;
        return Array.from({ length: PARTICLE_COUNT }, (_, index) => ({
            x: originX - 4,
            y: originY - 4,
            angle: randomIn(0, Math.PI * 2),
            burstDistance: randomIn(50, 190),
            fallDistance: randomIn(220, height * 0.5),
            spin: randomIn(-720, 720),
            size: randomIn(5, 12),
            color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
            circle: Math.random() > 0.5,
            delay: randomIn(0, 120),
        }));
    }, [width, height]);

    useEffect(() => {
        const maxDelay = particles.reduce((max, p) => Math.max(max, p.delay), 0);
        const totalDuration = maxDelay + BURST_DURATION + FALL_DURATION + 120;
        const timer = setTimeout(() => onDone?.(), totalDuration);
        return () => clearTimeout(timer);
    }, [particles, onDone]);

    const originX = width / 2;
    const originY = height * 0.42;

    return (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            {particles.map((config, index) => (
                <Particle key={index} config={config} />
            ))}
            <ConfettiText x={originX} y={originY} textWidth={340} textHeight={48} />
        </View>
    );
}

const styles = StyleSheet.create({
    particle: {
        position: "absolute",
    },
    confettiText: {
        position: "absolute",
        textAlign: "center",
        fontSize: 44,
        fontWeight: "900",
        color: "#FDE68A",
        textShadowColor: "rgba(245, 158, 11, 0.85)",
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 8,
    },
});
