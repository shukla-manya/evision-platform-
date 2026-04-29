/** Static blog posts (CCTV / IP / 4G / form factors). */

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  author: { name: string; initials: string };
  category: string;
  commentCount: number;
  body: string[];
};

const author = { name: 'admin', initials: 'A' };

export const blogPosts: BlogPost[] = [
  {
    slug: '4g-cctv-cameras-security-without-internet-or-wifi',
    title: '4G CCTV Cameras: Security Without Internet or WiFi',
    excerpt:
      'One of the biggest problems in security installation is lack of internet or WiFi availability. 4G LTE cameras solve that with cellular backhaul, solar options, and cloud or edge recording.',
    publishedAt: '2026-03-17T09:00:00+05:30',
    author,
    category: 'Blog',
    commentCount: 0,
    body: [
      'Rural sites, construction yards, farms, highway depots, and temporary event venues often have power but no reliable broadband. Traditional IP cameras expect a router, DHCP, and uplink. That gap is where 4G CCTV systems shine: the camera—or a small outdoor NVR—uses a nano-SIM and LTE data to send live view, alarms, and clips to your phone or a central monitoring desk.',
      'When planning a 4G deployment, start with coverage. Walk the site with a phone on the same operator you intend to use for the SIM, and note signal bars in the exact mounting positions. If signal is marginal, prefer a camera with an external antenna pigtail or a short PoE run to an indoor LTE router placed at a window.',
      'Bandwidth matters more than people assume. A 5 Mbps sustained uplink can support one or two 1080p sub-streams comfortably; 4K primary streams should be reserved for motion-triggered clips or scheduled uploads. Use adaptive bitrate in the vendor app, schedule high-resolution backup to night hours, and cap simultaneous viewers during peak tariff windows.',
      'Power is the second constraint. Mains-powered 4G domes are simplest for factories. For perimeters without trenching, combine a low-power bullet on a pole with a correctly sized solar panel, MPPT charge controller, and LiFePO₄ battery pack sized for three cloudy days. EVISION-style outdoor 4G lines are often specified with exactly this duty cycle in mind.',
      'Security of the security system: change default passwords, disable unused P2P clouds if you self-host, and use VPN or TLS-only access to any recorder. Treat the SIM like a key—IMEI lock where your operator supports it, and alert on unexpected data spikes that could indicate compromise or misconfigured continuous recording.',
      'Finally, align retention with compliance. Many Indian SMBs need 30–90 days of incident-capable footage rather than infinite cloud history. Hybrid designs—edge SD card for 7 days plus encrypted cloud for critical events—balance cost and resilience. Your installer should document IP addresses, APN names, and escalation contacts on a single-page handover.',
    ],
  },
  {
    slug: 'introduction-ip-cctv-cameras',
    title: 'Introduction to IP CCTV Cameras',
    excerpt:
      'Security is no longer a luxury — it is a necessity. IP cameras digitise video at the edge, ride on structured cabling, and integrate with access control, analytics, and modern VMS platforms.',
    publishedAt: '2026-03-17T10:30:00+05:30',
    author,
    category: 'Blog',
    commentCount: 0,
    body: [
      'An Internet Protocol (IP) CCTV camera captures light through a lens and sensor, then encodes frames with a codec such as H.265 or H.264. The resulting stream is packetised on Ethernet or Wi-Fi, which is why a single cable can carry power (via PoE), video, audio, and even I/O triggers when the device supports it.',
      'Compared to older analogue coax systems, IP brings megapixel counts that make digital zoom useful after the fact, ONVIF interoperability so you are not locked to one vendor’s DVR, and edge analytics—from line crossing to loitering—that run inside the camera before bandwidth is spent shipping pixels upstream.',
      'Resolution is only one line on the datasheet. Dynamic range (true WDR) decides whether a shopfront facing the street retains detail on faces indoors and signage outdoors in the same exposure. Lens speed (ƒ-number) and shutter behaviour matter for night plates on driveways. Always ask for a night demo clip recorded at the target scene, not a marketing reel.',
      'Networking basics still apply: separate VLANs or at least segregated subnets for cameras, DHCP reservations or static IPs documented in a spreadsheet, and uplinks sized for burst traffic when many channels motion-trigger at once. Managed PoE switches with SNMP and per-port power budgets reduce mystery reboots when heaters or IR cut in.',
      'For homes and small offices, a handful of Wi-Fi or PoE turrets behind a decent router is enough. For warehouses and schools, design around a spine of 1 Gbps switches, NVR or VMS recording with RAID, and off-site replication for ransomware resilience. EVISION bundles often pair indoor Wi-Fi series with PoE backbones for clean expansion paths.',
      'Closing thought: treat IP CCTV as a subsystem of your overall IT policy—patch firmware on a schedule, rotate credentials, and audit who can export footage. Good hygiene costs little compared to an incident you cannot reconstruct.',
    ],
  },
  {
    slug: 'choosing-bullet-vs-dome-cameras-property',
    title: 'Choosing Between Bullet and Dome Cameras for Your Property',
    excerpt:
      'Selecting the right form factor is as important as choosing resolution. Bullets excel at long corridors and perimeter lines; domes resist tampering and blend into retail ceilings.',
    publishedAt: '2026-02-25T14:00:00+05:30',
    author,
    category: 'Blog',
    commentCount: 0,
    body: [
      'Bullet cameras mount on a bracket with an obvious barrel, which makes aiming intuitive and sun-shields easy to attach. They are favoured along fence lines, loading bays, and anywhere you want visible deterrence. The trade-off is vulnerability: a determined intruder can grab or re-aim the housing unless you spec vandal-resistant variants and mount height thoughtfully.',
      'Dome cameras tuck the lens behind a polycarbonate bubble, which hides where the sensor is pointing—useful in banks and retail aisles—and offers IK10 mechanical protection on quality models. Motorised domes can pan, tilt, and zoom under operator control, replacing multiple fixed views in large floor plates.',
      'Environmental fit comes next. True outdoor bullets should list IP66 or better, cable glands that do not rely on silicone tape alone, and breathing valves to prevent internal fog. Indoor domes in kitchens or workshops need grease-resistant bubbles and periodic cleaning schedules because dust films soften night IR.',
      'Lighting drives both shapes. For licence plates at 25–40 metres you may still pick a bullet with a narrow lens and dedicated IR. For elevator lobbies with reflective marble, a dome with WDR and smart IR that throttles when subjects are close reduces blow-out.',
      'A practical mix for a typical Indian villa: bullet on the gate column for approach and ANPR-friendly framing, compact domes under eaves for porch and garage, and a discreet turret indoors where aesthetics matter. Document lens millimetres and horizontal field-of-view so future upgrades stay compatible with existing mounts.',
      'Your installer should provide a simple table: location, form factor, resolution, lens, storage days, and privacy masking zones (neighbour windows). That discipline saves rework when you expand to a second phase.',
    ],
  },
  {
    slug: 'why-ip-cameras-smart-choice-modern-security',
    title: 'Why IP Cameras Are the Smart Choice for Modern Security',
    excerpt:
      'Residential and commercial buyers today expect remote access, crisp evidence, and integration with alarms and access control. IP-based surveillance delivers all three with room to grow.',
    publishedAt: '2026-02-25T11:00:00+05:30',
    author,
    category: 'Blog',
    commentCount: 0,
    body: [
      'Modern security is a stack: sensors on doors, cameras on approaches, user identities on phones, and audit logs in the cloud or on-prem servers. IP cameras slot naturally into that stack because they speak standards IT teams already manage—DNS, TLS, LDAP or SAML for VMS logins, and syslog for forwarding events to SIEM tools.',
      'Cost conversations have shifted. A decade ago, IP looked expensive versus DVR + coax. Today, when you include cable pulls, passive baluns, limited analytics, and truck rolls for quality issues, well-designed IP often wins on total cost of ownership—especially if you reuse enterprise switching and UPS infrastructure.',
      'Cyber-resilience is non-negotiable. Choose vendors who publish CVE responses, ship signed firmware, and allow air-gapped updates. Segment cameras from guest Wi-Fi, disable UPnP port forwarding tricks, and prefer outbound-only HTTPS tunnels to a broker you control rather than wide-open port maps.',
      'For Indian enterprises juggling GST sites and franchise rollouts, centralised templates matter: one golden configuration exported to new branches, with password policies enforced at the NVR/VMS. IP’s remote provisioning cuts commissioning time compared to rolling a ladder to tweak each analogue DVR menu.',
      'Future-proofing is the quiet benefit. The same cable that carries 4 MP today can often carry 8 MP later if switch backhaul and storage IOPS allow. Audio lines, serial I/O for boom barriers, and API hooks for visitor management are all easier when the headend is digital from the glass onwards.',
      'Whether you are a homeowner checking in while travelling or a facilities head standardising 200 stores, IP cameras are the sensible default—provided design, networking, and governance are taken as seriously as the sticker price.',
    ],
  },
];

export function getBlogPostsSorted(): BlogPost[] {
  return [...blogPosts].sort((a, b) => {
    const t = new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    if (t !== 0) return t;
    return a.title.localeCompare(b.title);
  });
}

export function getBlogPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}

export function getAllBlogSlugs(): string[] {
  return blogPosts.map((p) => p.slug);
}

/** e.g. 17 Mar 2026 */
export function formatBlogDateShort(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
}

/** e.g. March 17, 2026 */
export function formatBlogDateLong(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(iso));
}
