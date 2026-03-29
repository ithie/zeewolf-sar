declare module '*.zsong' {
    const data: {
        bpm: string;
        activeData: Record<string, string>;
        config: Record<string, any>;
    };
    export default data;
}
