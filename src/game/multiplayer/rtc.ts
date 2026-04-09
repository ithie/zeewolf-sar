// ─── WebRTC peer connection (copy-paste signaling) ────────────────────────────
// No signaling server needed: host generates an offer (base64 SDP), shares it
// out-of-band, guest generates an answer, shares it back.
// Two data channels:
//   "pos"    – unreliable, max 0 retransmits → heli position snapshots (~20 Hz)
//   "events" – reliable, ordered             → game events, world snaps

import type { HeliSnap, MpEvent } from './sync';

const ICE_SERVERS: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
];

export interface MpChannels {
    sendPos: (snap: HeliSnap) => void;
    sendEvent: (evt: MpEvent) => void;
    onPos: (cb: (snap: HeliSnap) => void) => void;
    onEvent: (cb: (evt: MpEvent) => void) => void;
}

export interface RtcPeer {
    readonly isHost: boolean;
    /** Host: create offer SDP → returns base64 string after ICE gathering */
    createOffer(): Promise<string>;
    /** Guest: consume host's offer, return base64 answer */
    createAnswer(offerB64: string): Promise<string>;
    /** Host: consume guest's answer to complete handshake */
    applyAnswer(answerB64: string): Promise<void>;
    /** Called once data channels are open */
    onConnect(cb: (channels: MpChannels) => void): void;
    close(): void;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

const waitForIce = (pc: RTCPeerConnection): Promise<void> =>
    new Promise(resolve => {
        if (pc.iceGatheringState === 'complete') { resolve(); return; }
        const check = () => {
            if (pc.iceGatheringState === 'complete') {
                pc.removeEventListener('icegatheringstatechange', check);
                resolve();
            }
        };
        pc.addEventListener('icegatheringstatechange', check);
    });

const encode = (sdp: RTCSessionDescriptionInit): string => btoa(JSON.stringify(sdp));
const decode = (b64: string): RTCSessionDescriptionInit => JSON.parse(atob(b64));

// ─── factory ──────────────────────────────────────────────────────────────────

export const createRTCPeer = (): RtcPeer => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    let _isHost = false;
    let _connectCb: ((ch: MpChannels) => void) | null = null;
    let _posCb: ((snap: HeliSnap) => void) | null = null;
    let _eventCb: ((evt: MpEvent) => void) | null = null;

    const buildChannels = (posCh: RTCDataChannel, eventCh: RTCDataChannel): MpChannels => {
        posCh.onmessage = e => { if (_posCb) _posCb(JSON.parse(e.data as string)); };
        eventCh.onmessage = e => { if (_eventCb) _eventCb(JSON.parse(e.data as string)); };
        return {
            sendPos: snap => { if (posCh.readyState === 'open') posCh.send(JSON.stringify(snap)); },
            sendEvent: evt => { if (eventCh.readyState === 'open') eventCh.send(JSON.stringify(evt)); },
            onPos: cb => { _posCb = cb; },
            onEvent: cb => { _eventCb = cb; },
        };
    };

    const waitBothOpen = (
        posCh: RTCDataChannel,
        eventCh: RTCDataChannel,
    ) => {
        let posOpen = false, evtOpen = false;
        const check = () => {
            if (posOpen && evtOpen && _connectCb) _connectCb(buildChannels(posCh, eventCh));
        };
        posCh.onopen = () => { posOpen = true; check(); };
        eventCh.onopen = () => { evtOpen = true; check(); };
    };

    return {
        get isHost() { return _isHost; },

        createOffer: async () => {
            _isHost = true;
            const posCh = pc.createDataChannel('pos', { ordered: false, maxRetransmits: 0 });
            const eventCh = pc.createDataChannel('events', { ordered: true });
            waitBothOpen(posCh, eventCh);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            await waitForIce(pc);
            return encode(pc.localDescription!);
        },

        createAnswer: async (offerB64: string) => {
            _isHost = false;
            let _posCh: RTCDataChannel | null = null;
            let _eventCh: RTCDataChannel | null = null;
            let posReady = false, evtReady = false;
            const tryConnect = () => {
                if (posReady && evtReady && _posCh && _eventCh && _connectCb)
                    _connectCb(buildChannels(_posCh, _eventCh));
            };
            pc.ondatachannel = e => {
                if (e.channel.label === 'pos') {
                    _posCh = e.channel;
                    _posCh.onopen = () => { posReady = true; tryConnect(); };
                } else if (e.channel.label === 'events') {
                    _eventCh = e.channel;
                    _eventCh.onopen = () => { evtReady = true; tryConnect(); };
                }
            };
            await pc.setRemoteDescription(decode(offerB64));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await waitForIce(pc);
            return encode(pc.localDescription!);
        },

        applyAnswer: async (answerB64: string) => {
            await pc.setRemoteDescription(decode(answerB64));
        },

        onConnect: cb => { _connectCb = cb; },
        close: () => { pc.close(); },
    };
};
