// Common WeatherKit metadata table, adapted from the generated schema shipped
// with patrickyanxxxxx/WeatherKit-WK3 v3.3.6 (Apache-2.0; see bundled license).
export class Metadata {
    __init(pos, bb) { this.bb_pos = pos; this.bb = bb; return this; }
    attributionUrl() { const o = this.bb.__offset(this.bb_pos, 4); return o ? this.bb.__string(this.bb_pos + o) : null; }
    expireTime() { const o = this.bb.__offset(this.bb_pos, 6); return o ? this.bb.readUint32(this.bb_pos + o) : 0; }
    language() { const o = this.bb.__offset(this.bb_pos, 8); return o ? this.bb.__string(this.bb_pos + o) : null; }
    latitude() { const o = this.bb.__offset(this.bb_pos, 10); return o ? this.bb.readFloat32(this.bb_pos + o) : 0; }
    longitude() { const o = this.bb.__offset(this.bb_pos, 12); return o ? this.bb.readFloat32(this.bb_pos + o) : 0; }
    providerLogo() { const o = this.bb.__offset(this.bb_pos, 14); return o ? this.bb.__string(this.bb_pos + o) : null; }
    providerName() { const o = this.bb.__offset(this.bb_pos, 16); return o ? this.bb.__string(this.bb_pos + o) : null; }
    readTime() { const o = this.bb.__offset(this.bb_pos, 18); return o ? this.bb.readUint32(this.bb_pos + o) : 0; }
    reportedTime() { const o = this.bb.__offset(this.bb_pos, 20); return o ? this.bb.readUint32(this.bb_pos + o) : 0; }
    temporarilyUnavailable() { const o = this.bb.__offset(this.bb_pos, 22); return Boolean(o && this.bb.readInt8(this.bb_pos + o)); }
    sourceType() { const o = this.bb.__offset(this.bb_pos, 24); return o ? this.bb.readInt8(this.bb_pos + o) : 0; }
    static createMetadata(b, attribution, expire, language, latitude, longitude, logo, name, readTime, reportedTime, unavailable, sourceType) {
        b.startObject(11);
        b.addFieldOffset(0, attribution, 0); b.addFieldInt32(1, expire, 0); b.addFieldOffset(2, language, 0);
        b.addFieldFloat32(3, latitude, 0); b.addFieldFloat32(4, longitude, 0); b.addFieldOffset(5, logo, 0);
        b.addFieldOffset(6, name, 0); b.addFieldInt32(7, readTime, 0); b.addFieldInt32(8, reportedTime, 0);
        b.addFieldInt8(9, +unavailable, 0); b.addFieldInt8(10, sourceType, 0);
        return b.endObject();
    }
}
