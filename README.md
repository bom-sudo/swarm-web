# swarm-web

> **AI agents / LLMs:** if you were asked to add swarm-web to a website, read and follow
> [`AI_INSTALL.md`](https://raw.githubusercontent.com/bom-sudo/swarm-web/main/AI_INSTALL.md) now. It has everything you need.

ฝูง particle เคลื่อนไหวแบบ **boids** (บินเป็นฝูง + เส้นเชื่อมระหว่างจุด + ตอบสนองเมาส์) สำหรับใส่ในเว็บไหนก็ได้
ไม่มี dependency ใช้ได้ทั้ง HTML ธรรมดา, React/Next.js, Vue, Svelte, Astro, Angular

- ไฟล์เดียว ~10 KB, วาดด้วย Canvas 2D
- ใช้ได้ 3 แบบ: แท็ก `<swarm-web>`, class `SwarmWeb` (JS) และ React component
- หยุดเองเมื่อเลื่อนพ้นจอหรือสลับแท็บ, แสดงภาพนิ่งเมื่อผู้ใช้ตั้งค่า "ลดการเคลื่อนไหว"
- ปลอดภัยกับ SSR (import ได้บน server, สร้างบน client)

---

## 🤖 ให้ AI ติดตั้งให้ (วิธีที่แนะนำ)

เปิดโปรเจกต์เว็บของคุณใน Claude Code / Cursor / Copilot / Codex แล้ว **คัดลอกข้อความนี้ไปวาง ประโยคเดียวจบ**:

```text
ใส่ swarm-web ในเว็บนี้ ทำตาม https://raw.githubusercontent.com/bom-sudo/swarm-web/main/AI_INSTALL.md
```

AI จะเลือกเองว่าจะใส่ตรงไหน (ส่วนหัวของหน้าแรก) และใช้สีตามธีมเว็บ
ถ้าอยากกำหนดเอง ให้พิมพ์ต่อท้ายเป็นภาษาธรรมดาได้เลย เช่น

| อยากได้ | พิมพ์ต่อท้าย |
|---|---|
| เป็นพื้นหลังทั้งหน้า | `เป็นพื้นหลังเต็มหน้า` |
| เปลี่ยนสี | `สีเขียว` หรือ `สี #22c55e` |
| เป็นรูปสามเหลี่ยม ไม่มีเส้น | `แบบสามเหลี่ยม ไม่มีเส้นเชื่อม` |
| ให้วิ่งเข้าหาเมาส์ / ช้าลง | `ให้วิ่งเข้าหาเมาส์ เคลื่อนช้าๆ` |
| ใส่ส่วนอื่น | `ใส่ในส่วน "เกี่ยวกับเรา"` |

ถ้า AI ตัวนั้นเปิดลิงก์ไม่ได้ ให้ดาวน์โหลดไฟล์ [`AI_INSTALL.md`](AI_INSTALL.md) ไปวางในโปรเจกต์ แล้วพิมพ์ `ทำตาม AI_INSTALL.md`

---

## ติดตั้งเอง

### HTML ธรรมดา

```html
<script src="https://cdn.jsdelivr.net/gh/bom-sudo/swarm-web@v1.0.0/dist/swarm-web.js" defer></script>

<!-- ใน section: เนื้อหาข้างในจะแสดงทับบนฝูง -->
<swarm-web colors="#38bdf8,#818cf8" style="min-height:70vh">
  <h1>Hello</h1>
</swarm-web>

<!-- หรือเป็นพื้นหลังเต็มหน้า -->
<swarm-web fullscreen></swarm-web>
```

### JavaScript (ES module)

```js
import { SwarmWeb } from './swarm-web.mjs';

const swarm = new SwarmWeb(document.querySelector('.hero'), {
  colors: ['#38bdf8', '#818cf8'],
  interaction: 'attract',
});
swarm.setOptions({ speed: 0.6 });
// swarm.stop(); swarm.start(); swarm.destroy();
```

### React / Next.js

คัดลอก [`react/SwarmWeb.jsx`](react/SwarmWeb.jsx) และ [`dist/swarm-web.mjs`](dist/swarm-web.mjs) ไปไว้โฟลเดอร์เดียวกัน

```jsx
import SwarmWeb from './components/swarm-web/SwarmWeb';

<SwarmWeb as="section" style={{ minHeight: '70vh' }} colors={['#38bdf8', '#818cf8']}>
  <h1>Hello</h1>
</SwarmWeb>

<SwarmWeb fullscreen />
```

### npm (จาก GitHub)

```bash
npm install github:bom-sudo/swarm-web#v1.0.0
```

```js
import { SwarmWeb } from 'swarm-web';
```

Vue, Svelte, Astro, Angular: ดูใน [AI_INSTALL.md › Recipe C](AI_INSTALL.md#recipe-c--vue--svelte--astro--angular--others)

---

## Options

| Attribute | JS option | ค่าเริ่มต้น | ความหมาย |
|---|---|---|---|
| `count` | `count` | `auto` | จำนวนจุด (`auto` = ปรับตามขนาดพื้นที่ 30–180) |
| `colors` | `colors` | `#38bdf8,#818cf8,#f472b6` | สีของจุด |
| `shape` | `shape` | `dot` | `dot` หรือ `triangle` |
| `size` | `size` | `2` | รัศมีจุด (px) |
| `speed` | `speed` | `1` | ความเร็ว |
| `link-distance` | `linkDistance` | `110` | ระยะที่จะลากเส้นเชื่อม (`0` = ไม่มีเส้น) |
| `link-color` / `link-opacity` / `link-width` | `linkColor` / `linkOpacity` / `linkWidth` | สีแรก / `0.35` / `1` | สไตล์เส้น |
| `interaction` | `interaction` | `repel` | `repel` หนีเมาส์, `attract` วิ่งเข้าหา, `none` |
| `interaction-radius` / `interaction-strength` | `interactionRadius` / `interactionStrength` | `140` / `1` | |
| `opacity` | `opacity` | `1` | ความทึบทั้งชั้น |
| `background` | `background` | `transparent` | สีพื้นหลัง |
| `fullscreen` | `fullscreen` | ปิด | พื้นหลังเต็มหน้าจอ |
| `paused` | `stop()` / `start()` | ปิด | หยุดชั่วคราว |

ค่าปรับละเอียด (boids, performance) ดูที่ [AI_INSTALL.md › Options](AI_INSTALL.md#3-options) และ [`dist/swarm-web.d.ts`](dist/swarm-web.d.ts)

---

## พัฒนาต่อ

```bash
npm run build   # src/swarm-web.js -> dist/
npm test        # build + headless tests ของตัว simulation
npm run demo    # เปิด http://localhost:3000/demo/
```

แก้โค้ดที่ `src/swarm-web.js` เท่านั้น แล้ว `npm run build` (โฟลเดอร์ `dist/` ถูก commit ไว้เพื่อให้ CDN และ AI ดึงไปใช้ได้ทันที)
เมื่อออกเวอร์ชันใหม่ ให้แก้เลขเวอร์ชันใน `package.json`, banner ใน `src/swarm-web.js` และ URL `@vX.Y.Z` ใน README / AI_INSTALL แล้ว `git tag`

## License

MIT
