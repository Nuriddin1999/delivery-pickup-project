import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { GeoJSON, MapContainer, Marker, Polyline, TileLayer, Tooltip, useMapEvents } from 'react-leaflet'
import type { Point, Route, State } from '../types'
import { isBroken, kg, kindLabel } from '../logic'

export type MapMode = 'none' | 'regions' | 'pickStart'

interface Props {
  shapes: GeoJSON.FeatureCollection | null
  state: State
  colors: Record<string, string>
  mode: MapMode
  /** regions shown as chosen while editing a courier's regions */
  draftRegions: string[] | null
  draftColor: string
  onToggleRegion: (name: string) => void
  onPickPoint: (p: Point) => void
  selectedOrderId: string | null
  onSelectOrder: (id: string) => void
  route: { route: Route; color: string } | null
  startPreview: Point | null
}

const regionName = (f?: GeoJSON.Feature) => (f?.properties?.name as string) ?? ''

export function MapView(props: Props) {
  const { state, colors, mode } = props
  const couriersById = Object.fromEntries(state.couriers.map((c) => [c.id, c]))

  return (
    <MapContainer
      center={[state.hub.lat, state.hub.lng]}
      zoom={12}
      className={`map mode-${mode}`}
      doubleClickZoom={mode === 'none'}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickCatcher enabled={mode === 'pickStart'} onPick={props.onPickPoint} />

      {props.shapes && (
        <RegionsLayer
          shapes={props.shapes}
          style={(name) => regionStyle(name, mode, props.draftRegions, props.draftColor)}
          onClick={(name, p) => {
            if (mode === 'regions') props.onToggleRegion(name)
            else if (mode === 'pickStart') props.onPickPoint(p)
          }}
        />
      )}

      {props.route && props.route.route.stops.length > 1 && (
        <Polyline
          positions={props.route.route.stops.map((s) => [s.point.lat, s.point.lng] as [number, number])}
          pathOptions={{ color: props.route.color, weight: 4, opacity: 0.8, dashArray: '8 6' }}
        />
      )}

      <Marker position={[state.hub.lat, state.hub.lng]} icon={hubIcon} zIndexOffset={1000}>
        <Tooltip direction="top" offset={[0, -14]}>{state.hub.name}: every parcel passes here</Tooltip>
      </Marker>

      {state.couriers.map((c) => (
        <Marker key={c.id} position={[c.start.lat, c.start.lng]} icon={startIcon(colors[c.id], c.name)}>
          <Tooltip direction="top" offset={[0, -10]}>{c.name} starts here</Tooltip>
        </Marker>
      ))}

      {state.orders.map((o) => {
        if (!o.location) return null
        const courier = o.courier_id ? couriersById[o.courier_id] : undefined
        return (
          <Marker
            key={o.id}
            position={[o.location.lat, o.location.lng]}
            icon={orderIcon({
              type: o.type,
              color: courier ? colors[courier.id] : null,
              broken: isBroken(o),
              outside: o.outside_regions,
              selected: o.id === props.selectedOrderId,
            })}
            zIndexOffset={o.id === props.selectedOrderId ? 900 : 0}
            eventHandlers={{ click: () => props.onSelectOrder(o.id) }}
          >
            <Tooltip direction="top" offset={[0, -12]}>
              <b>{o.id}</b> · {kindLabel(o.type)} · {o.region} · {kg(o.weight_kg)}
              <br />
              {isBroken(o) ? `Broken: ${o.problems!.join('; ')}` : courier ? `Courier: ${courier.name}` : 'No courier yet'}
              {o.outside_regions && <><br />Outside {courier?.name}'s regions</>}
            </Tooltip>
          </Marker>
        )
      })}

      {props.startPreview && (
        <Marker position={[props.startPreview.lat, props.startPreview.lng]} icon={newStartIcon}>
          <Tooltip permanent direction="top" offset={[0, -12]}>New courier start</Tooltip>
        </Marker>
      )}
    </MapContainer>
  )
}

function ClickCatcher({ enabled, onPick }: { enabled: boolean; onPick: (p: Point) => void }) {
  useMapEvents({
    click: (e) => {
      if (enabled) onPick({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })
  return null
}

/**
 * Region shapes with name labels. Leaflet keeps its own layers, so the
 * latest style and click handler are passed through refs.
 */
function RegionsLayer(props: {
  shapes: GeoJSON.FeatureCollection
  style: (name: string) => L.PathOptions
  onClick: (name: string, p: Point) => void
}) {
  const layer = useRef<L.GeoJSON | null>(null)
  const latest = useRef(props)
  latest.current = props

  useEffect(() => {
    layer.current?.setStyle((f) => latest.current.style(regionName(f)))
  })

  return (
    <GeoJSON
      ref={layer}
      data={props.shapes}
      style={(f) => props.style(regionName(f))}
      onEachFeature={(f, l) => {
        const name = regionName(f)
        l.bindTooltip(name, { permanent: true, direction: 'center', className: 'region-label' })
        l.on('click', (e: L.LeafletMouseEvent) => {
          L.DomEvent.stopPropagation(e)
          latest.current.onClick(name, { lat: e.latlng.lat, lng: e.latlng.lng })
        })
      }}
    />
  )
}

function regionStyle(name: string, mode: MapMode, draft: string[] | null, color: string): L.PathOptions {
  if (mode === 'regions' && draft) {
    const on = draft.includes(name)
    return {
      color: on ? color : '#64748b',
      weight: on ? 3 : 1,
      fillColor: on ? color : '#94a3b8',
      fillOpacity: on ? 0.35 : 0.06,
    }
  }
  return { color: '#334155', weight: 2, fillColor: '#94a3b8', fillOpacity: 0.12 }
}

// ---- icons ----

const hubIcon = L.divIcon({ className: 'pin-wrap', html: '<div class="hub-pin">HUB</div>', iconSize: [40, 22], iconAnchor: [20, 11] })
const newStartIcon = L.divIcon({ className: 'pin-wrap', html: '<div class="new-start-pin">+</div>', iconSize: [22, 22], iconAnchor: [11, 11] })

function startIcon(color: string, name: string) {
  return L.divIcon({
    className: 'pin-wrap',
    html: `<div class="start-pin" style="--c:${color}">${escapeHtml(name.charAt(0))}</div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  })
}

function orderIcon(o: { type: string; color: string | null; broken: boolean; outside: boolean; selected: boolean }) {
  const shape = o.type === 'pickup' ? 'pickup' : o.type === 'delivery' ? 'delivery' : 'other'
  const letter = o.broken ? '!' : shape === 'pickup' ? 'P' : shape === 'delivery' ? 'D' : '?'
  const cls = ['order-pin', shape, o.color ? 'taken' : 'free', o.broken && 'broken', o.outside && 'outside', o.selected && 'selected']
    .filter(Boolean)
    .join(' ')
  const style = o.color ? `--c:${o.color}` : ''
  return L.divIcon({
    className: 'pin-wrap',
    html: `<div class="${cls}" style="${style}"><span>${letter}</span></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`)
}
