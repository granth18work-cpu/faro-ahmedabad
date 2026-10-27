# Faro Gurukul Street

Project 01 of Faro Ahmedabad · Gurukul Road, Memnagar

## The prototype

- **Live:** https://faro-ahmedabad.thedrytextco.online
- **Source:** `src/` at the top of this repository, built into `site/index.html` with `python3 build.py`. Textures and sky lighting live in `site/assets/`.
- **Version:** 1, built 1 October 2026, live on its own subdomain since 12 October 2026.

## What's in it

**Realistic version (24 October 2026):** late-afternoon light with a physical sky and real-world sky lighting, photo-scanned textures (asphalt, plaster, interlocking pavers, concrete, rolling shutters, tiles, wood, bark) from Poly Haven, soft contact shadows on desktop, muted colours throughout. The street is now about 250 m long with 32 buildings: the 12 boutiques sit in the middle, surrounded by everyday businesses (pharmacy, sweets, mobile shop, xerox, dairy, hardware, a TO LET shutter), homes and offices above, electric poles with tangled cables, neem trees and parked two-wheelers and cars.

- **Ride a scooter or motorbike:** press R (or tap Ride) to bring one to you, or walk to the Faro Rides stand inside the arch. Throttle, brakes, speed-dependent steering, leaning into turns, engine sound and horn. Park it anywhere and walk off.
- **Traffic:** scooters, motorbikes, auto-rickshaws and cars drive on the left, loop round both roundabouts, stop for people in the way and honk if you block them.
- **Avatars:** adult proportions, everyday outfits (shirt and jeans, kurti with palazzo) alongside kurta, saree, chaniya choli and sherwani, in muted colours.

**Real people and fixes (27 October 2026):**

- **Real 3D people:** everyone on the street (you, passers-by, the shopkeeper, traffic riders and friends) is now a professionally made human from Microsoft Rocketbox (MIT licence) with real walk, run, idle, wave and seated animations. "Choose your look" offers eight people, including a salwar suit and a kurta pyjama. Riders hold the handlebar grips using two-joint arm reaching that follows the steering. Window mannequins keep the Indian outfits.
- **Shops are reachable again:** the shop's "View shop" button always wins the prompt (a parked scooter gets its own small Ride button), riding up to a shop offers "Park & visit", doors are wider and marked with a doormat.
- **Smoother friends:** friends' movement is buffered and played back slightly behind real time, adapting to network jitter, with short prediction when an update is late; riders send 15 updates a second. Fixed a bug that pinned friends to the old, shorter street.
- **Vehicles:** scooters rebuilt from rounded shells (curved leg shield, egg-shaped body), motorbike tank and tail from real profiles, hatchbacks with wheel arches and a sloped windscreen, autos with a curved canopy. Headlights no longer glare in daylight.
- **Speed:** ambient occlusion is skipped on integrated graphics, and quality steps down faster when frames drop.

**From earlier versions** (the dusk look, festival lights and lighthouse beam were replaced by the realistic version):

- **Opening screen:** the camera drifts down the street at dusk, through an entrance arch that says "પધારો" (welcome). Leaving the street, the back of the arch says "આવજો".
- **Avatar maker:** name tag, outfit (kurta, chaniya choli, saree, sherwani), colour, border work, skin tone and hair (including a safo). Avatars are built from smooth, rounded shapes with fabric patterns such as bandhani dots, mirror work and zari borders.
- **The street:** 12 sample shops, 6 on each side, each with an English and Gujarati signboard, awning, marigold toran and a walk-in interior (stock shelves, racks, window mannequins, a white gaddi in saree shops). A shopkeeper waves when you enter. Other shoppers walk the footpaths, and there are parked rickshaws, scooters, a chai cart and festival lights across the road.
- **The lighthouse:** a Faro lighthouse with a turning beam at the end of the street.
- **Find a shop:** search with category filters, plus a clickable mini map. Both take you straight to a shop.
- **Shop panel:** price range, timings, rent, alterations, what the shop is known for, a Faro code with its offer, and a WhatsApp button (demo only).
- **Shop together (added 20 October 2026):** start a group, send the link on WhatsApp, and friends who open it appear on the same street with their own avatars and name tags. Anyone can **Go to** a friend or **Follow** them, send reactions (❤️, 👀, "This one?", "Let's go inside", "Over here!") that pop up above their avatar, and build one shared **shortlist** of shops. Up to 8 people, private by link, no accounts. Phones connect directly to each other (WebRTC through the Trystero library); public relays only help them find each other, and the room code encrypts that step. Some mobile networks block direct connections; if friends can't see each other, one of them should try Wi-Fi.
- **Smoothness:** ran at a steady 60 fps on a Mac. On slower devices it automatically lowers quality step by step instead of stuttering.

## Controls

| Action | Desktop | Phone |
|---|---|---|
| Walk | W A S D or arrow keys | On-screen joystick |
| Run | Hold Shift | Push the joystick all the way |
| Look around | Drag with the mouse, scroll to zoom | Drag, pinch to zoom |
| Open a shop | E when you're in front of it | Tap "View shop" |
| Find a shop | F | "Find a shop" button |
| Shop together | G | "Together" button |
| Ride / get off | R | "Ride" button / "Get off" |
| Throttle, brake, steer (riding) | W, S, A and D | Joystick up, down, sideways |
| Horn (riding) | H | "Horn" button |
| Send a reaction (in a group) | Keys 1 to 5, or the 😊 button | 😊 button |

## Sample data

All 12 shop names, prices, timings, offers and Faro codes are invented placeholders, and the page says so. They get replaced with real shops as you collect their details.

## Next steps

1. Street survey: list every real shop on Gurukul Street.
2. Pick the first founding shops and collect their details and storefront photos (used as reference for the 3D replica, not shown on the site).
3. Restyle each shop to match its real storefront, with its real name.
4. Decide on the look: keep dusk only, or add a daytime version.
5. Test on real phones, especially mid-range Android.
