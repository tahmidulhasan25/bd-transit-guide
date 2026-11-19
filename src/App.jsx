import { useState, useEffect, useMemo } from 'react';
import {
  Train,
  TramFront,
  Bus,
  Search,
  MapPin,
  Clock,
  CalendarOff,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ArrowLeft,
  ArrowLeftRight,
  Ticket,
  Sparkles,
  Layers,
} from 'lucide-react';
import { BD_DIVISIONS, DIVISION_NAMES } from './data/bdLocations';

const MODE_CONFIG = {
  all: {
    label: 'সব (ট্রেন + বাস + মেট্রো)',
    icon: Layers,
    activeTab: 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25 border-amber-400',
    badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    accentText: 'text-amber-400',
    cardBorder: 'hover:border-amber-500/50',
    dotColor: 'bg-amber-400',
  },
  trains: {
    label: 'ট্রেন',
    icon: Train,
    activeTab: 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 border-emerald-500',
    badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    accentText: 'text-emerald-400',
    cardBorder: 'hover:border-emerald-500/50',
    dotColor: 'bg-emerald-400',
  },
  buses: {
    label: 'বাস',
    icon: Bus,
    activeTab: 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border-indigo-500',
    badge: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    accentText: 'text-indigo-400',
    cardBorder: 'hover:border-indigo-500/50',
    dotColor: 'bg-indigo-400',
  },
  metro: {
    label: 'মেট্রোরেল',
    icon: TramFront,
    activeTab: 'bg-teal-600 text-white shadow-lg shadow-teal-600/30 border-teal-500',
    badge: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
    accentText: 'text-teal-400',
    cardBorder: 'hover:border-teal-500/50',
    dotColor: 'bg-teal-400',
  },
};

// জেলা বা বিভাগ কোনো রুটের from, to বা stops-এ আছে কি না তা যাচাই করার হেল্পার
function itemMatchesLocation(item, division, district) {
  const targetDistricts =
    district !== 'All'
      ? [district]
      : division !== 'All'
      ? BD_DIVISIONS[division] || []
      : null;

  if (!targetDistricts) return true;

  const lowerTargets = targetDistricts.map((d) => d.toLowerCase());
  const fromMatch = lowerTargets.some((d) => item.from?.toLowerCase().includes(d));
  const toMatch = lowerTargets.some((d) => item.to?.toLowerCase().includes(d));
  const stopMatch = item.stops?.some(
    (s) =>
      lowerTargets.some((d) => s.station?.toLowerCase().includes(d)) ||
      lowerTargets.some((d) => s.district?.toLowerCase().includes(d))
  );

  return {
    matches: fromMatch || toMatch || stopMatch,
    fromMatch,
    toMatch,
    stopMatch,
  };
}

export default function App() {
  const [activeMode, setActiveMode] = useState('all');
  const [allData, setAllData] = useState({ trains: [], buses: [], metro: [] });
  const [loading, setLoading] = useState(true);

  const [selectedDivision, setSelectedDivision] = useState('All');
  const [selectedDistrict, setSelectedDistrict] = useState('All');
  const [directionFilter, setDirectionFilter] = useState('both'); // 'both' | 'to' | 'from'
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedKey, setExpandedKey] = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch('/data/trains.json').then((r) => (r.ok ? r.json() : [])).catch(() => []),
      fetch('/data/buses.json').then((r) => (r.ok ? r.json() : [])).catch(() => []),
      fetch('/data/metro.json').then((r) => (r.ok ? r.json() : [])).catch(() => []),
    ]).then(([trains, buses, metro]) => {
      setAllData({
        trains: trains.map((x) => ({ ...x, mode: 'trains' })),
        buses: buses.map((x) => ({ ...x, mode: 'buses' })),
        metro: metro.map((x) => ({ ...x, mode: 'metro' })),
      });
      setLoading(false);
    });
  }, []);

  const districtsForDivision = useMemo(() => {
    if (selectedDivision === 'All') {
      return Object.values(BD_DIVISIONS).flat();
    }
    return BD_DIVISIONS[selectedDivision] || [];
  }, [selectedDivision]);

  const combinedItems = useMemo(() => {
    if (activeMode === 'all') {
      return [...allData.trains, ...allData.buses, ...allData.metro];
    }
    return allData[activeMode] || [];
  }, [allData, activeMode]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const targetDistricts =
      selectedDistrict !== 'All'
        ? [selectedDistrict.toLowerCase()]
        : selectedDivision !== 'All'
        ? (BD_DIVISIONS[selectedDivision] || []).map((d) => d.toLowerCase())
        : null;

    return combinedItems
      .map((item) => {
        const loc = itemMatchesLocation(item, selectedDivision, selectedDistrict);
        if (targetDistricts && !loc.matches) return null;

        // Direction filter when a specific district or division is selected
        if (targetDistricts && directionFilter !== 'both') {
          const goingToTarget =
            loc.toMatch ||
            (item.stops?.some((s) =>
              targetDistricts.some(
                (d) =>
                  s.station?.toLowerCase().includes(d) ||
                  s.district?.toLowerCase().includes(d)
              )
            ) &&
              !loc.fromMatch);

          const leavingFromTarget = loc.fromMatch;

          if (directionFilter === 'to' && !goingToTarget) return null;
          if (directionFilter === 'from' && !leavingFromTarget) return null;
        }

        const matchSearch =
          !q ||
          item.name?.toLowerCase().includes(q) ||
          item.bnName?.toLowerCase().includes(q) ||
          item.number?.toLowerCase().includes(q) ||
          item.from?.toLowerCase().includes(q) ||
          item.to?.toLowerCase().includes(q) ||
          item.stops?.some((s) => s.station?.toLowerCase().includes(q));

        if (!matchSearch) return null;

        let directionTag = 'রুট';
        if (targetDistricts) {
          if (loc.fromMatch && loc.toMatch) directionTag = 'এই জেলা হয়ে যাচ্ছে';
          else if (loc.fromMatch) directionTag = `${selectedDistrict !== 'All' ? selectedDistrict : selectedDivision} থেকে যাচ্ছে`;
          else directionTag = `${selectedDistrict !== 'All' ? selectedDistrict : selectedDivision}ে আসছে`;
        }

        return { ...item, directionTag };
      })
      .filter(Boolean);
  }, [combinedItems, selectedDivision, selectedDistrict, directionFilter, searchQuery]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <header className="border-b border-slate-800/80 bg-slate-900/70 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4 py-8 text-center">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1 text-xs font-medium text-emerald-300">
            <Sparkles className="h-3.5 w-3.5" />
            ৮ বিভাগ • ৬৪ জেলা • ট্রেন ও বাস যাওয়া-আসা গাইড
          </div>

          <h1 className="bg-gradient-to-r from-emerald-300 via-teal-200 to-amber-300 bg-clip-text text-3xl font-extrabold text-transparent sm:text-5xl">
            বাংলাদেশ ট্রানজিট গাইড
          </h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-400">
            বিভাগ ও জেলা সিলেক্ট করে সারাদেশে ট্রেন, বাস ও মেট্রোরেলের যাওয়া-আসার রুট ও সময়সূচি দেখুন
          </p>

          {/* Transit Mode Tabs */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
            {Object.entries(MODE_CONFIG).map(([key, cfg]) => {
              const Icon = cfg.icon;
              const isActive = activeMode === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveMode(key)}
                  className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs sm:text-sm font-semibold transition cursor-pointer ${
                    isActive
                      ? cfg.activeTab
                      : 'border-slate-700/80 bg-slate-800/60 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{cfg.label}</span>
                </button>
              );
            })}
          </div>

          {/* 8 Divisions -> District -> Direction -> Search */}
          <div className="mx-auto mt-6 grid max-w-5xl grid-cols-1 gap-3 rounded-2xl border border-slate-800 bg-slate-900/95 p-3.5 shadow-2xl sm:grid-cols-12">
            {/* 1. 8 Divisions */}
            <div className="sm:col-span-3">
              <label className="mb-1 block text-left text-[11px] font-medium text-slate-400">
                ১. বিভাগ সিলেক্ট করুন (৮টি)
              </label>
              <select
                value={selectedDivision}
                onChange={(e) => {
                  setSelectedDivision(e.target.value);
                  setSelectedDistrict('All');
                }}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500"
              >
                <option value="All">সকল বিভাগ (৮টি বিভাগ)</option>
                {DIVISION_NAMES.map((div) => (
                  <option key={div} value={div}>
                    {div} ({BD_DIVISIONS[div].length} জেলা)
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Districts of Selected Division */}
            <div className="sm:col-span-3">
              <label className="mb-1 block text-left text-[11px] font-medium text-slate-400">
                ২. জেলা সিলেক্ট করুন
              </label>
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500"
              >
                <option value="All">
                  {selectedDivision === 'All'
                    ? 'সকল জেলা (৬৪ জেলা)'
                    : `${selectedDivision}-এর সকল জেলা`}
                </option>
                {districtsForDivision.map((dist) => (
                  <option key={dist} value={dist}>
                    {dist}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Direction (Going To / Coming From / Both) */}
            <div className="sm:col-span-2">
              <label className="mb-1 block text-left text-[11px] font-medium text-slate-400">
                ৩. যাওয়া / আসা
              </label>
              <select
                value={directionFilter}
                onChange={(e) => setDirectionFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500"
              >
                <option value="both">যাওয়া ও আসা (সব)</option>
                <option value="to">এই জেলায় যাওয়া</option>
                <option value="from">এই জেলা থেকে যাওয়া</option>
              </select>
            </div>

            {/* 4. Keyword Search */}
            <div className="sm:col-span-4">
              <label className="mb-1 block text-left text-[11px] font-medium text-slate-400">
                ৪. নাম / স্টেশন সার্চ
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="যেমন: Subarna, Ena, Mymensingh..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2.5 pr-3 pl-9 text-sm text-white placeholder-slate-400 outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-white sm:text-2xl">
              {selectedDistrict !== 'All'
                ? `${selectedDistrict} জেলার যাওয়া-আসার রুট`
                : selectedDivision !== 'All'
                ? `${selectedDivision} বিভাগের যাওয়া-আসার রুট`
                : 'সারাদেশের রুট ও শিডিউল'}
            </h2>
            <p className="text-xs text-slate-400">
              {selectedDivision !== 'All' ? `বিভাগ: ${selectedDivision}` : 'সকল বিভাগ'} •{' '}
              {selectedDistrict !== 'All' ? `জেলা: ${selectedDistrict}` : 'সকল জেলা'}
            </p>
          </div>
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold text-emerald-300">
            মোট রুট: {filteredItems.length}টি
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400">ডেটা লোড হচ্ছে...</div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center">
            <p className="text-lg font-semibold text-slate-200">
              এই ফিল্টারে কোনো রুট পাওয়া যায়নি
            </p>
            <p className="mt-1 text-sm text-slate-400">
              অন্য জেলা/বিভাগ বা “যাওয়া ও আসা (সব)” সিলেক্ট করে দেখুন, অথবা JSON ফাইলে আরও রুট যোগ করুন।
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {filteredItems.map((item) => {
              const cardTheme = MODE_CONFIG[item.mode] || MODE_CONFIG.trains;
              const uniqueKey = `${item.mode}-${item.id}`;
              const isExpanded = expandedKey === uniqueKey;

              return (
                <div
                  key={uniqueKey}
                  className={`flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/85 p-5 shadow-xl transition ${cardTheme.cardBorder}`}
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`rounded-lg border px-2.5 py-1 text-xs font-bold uppercase ${cardTheme.badge}`}>
                          {item.mode === 'trains' ? 'ট্রেন' : item.mode === 'buses' ? 'বাস' : 'মেট্রো'} #{item.number}
                        </span>
                        <span className="rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs text-slate-300">
                          {item.directionTag}
                        </span>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium ${
                          item.offDay && item.offDay !== 'None'
                            ? 'border border-rose-500/25 bg-rose-500/15 text-rose-300'
                            : 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                        }`}
                      >
                        <CalendarOff className="h-3.5 w-3.5" />
                        {item.offDay === 'None' ? 'প্রতিদিন' : `ছুটি: ${item.offDay}`}
                      </span>
                    </div>

                    <div className="mt-3">
                      <h3 className="text-lg font-bold text-white">{item.name}</h3>
                      <p className={`text-sm font-medium ${cardTheme.accentText}`}>{item.bnName}</p>
                    </div>

                    <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/75 px-4 py-3">
                      <div>
                        <p className="text-[11px] text-slate-500">যাত্রা শুরু (From)</p>
                        <p className="font-semibold text-slate-100">{item.from}</p>
                        <p className={`text-xs font-bold ${cardTheme.accentText}`}>{item.departure}</p>
                      </div>

                      <div className="flex flex-col items-center px-2">
                        <span className="text-[11px] text-slate-400">{item.duration}</span>
                        <div className="my-1 flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                          <span className="h-[1px] w-8 bg-slate-700" />
                          <ArrowRight className={`h-4 w-4 ${cardTheme.accentText}`} />
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-[11px] text-slate-500">গন্তব্য (To)</p>
                        <p className="font-semibold text-slate-100">{item.to}</p>
                        <p className="text-xs font-medium text-slate-300">{item.arrival}</p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-amber-400" />
                        সময়: <strong className="text-slate-200">{item.duration}</strong>
                      </span>
                      {item.fare && (
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2.5 py-1 font-medium text-amber-300">
                          <Ticket className="h-3.5 w-3.5" />
                          ভাড়া: {item.fare}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 border-t border-slate-800/80 pt-3">
                    <button
                      onClick={() => setExpandedKey(isExpanded ? null : uniqueKey)}
                      className="flex w-full items-center justify-between rounded-lg bg-slate-800/60 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-800 cursor-pointer"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className={`h-3.5 w-3.5 ${cardTheme.accentText}`} />
                        স্টপেজ ও সময়সূচি ({item.stops?.length || 0}টি)
                      </span>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>

                    {isExpanded && item.stops && (
                      <div className="mt-3 ml-2 space-y-2.5 border-l-2 border-slate-700 pl-4">
                        {item.stops.map((stop, idx) => (
                          <div key={idx} className="relative flex items-center justify-between text-xs">
                            <span
                              className={`absolute -left-[21px] h-2.5 w-2.5 rounded-full ring-4 ring-slate-900 ${cardTheme.dotColor}`}
                            />
                            <span className="font-medium text-slate-200">
                              {stop.station}{' '}
                              {stop.district ? (
                                <span className="text-slate-500">({stop.district})</span>
                              ) : null}
                            </span>
                            <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-slate-300">
                              {stop.time}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}