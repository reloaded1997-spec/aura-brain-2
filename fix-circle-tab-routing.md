# Bug Fix: People Added on Circle Tab Land in Acquaintances Instead of Profiles

## Problem

`src/pages/AcquaintancesPage.jsx` (the Circle tab in bottom nav) has an `AcquaintanceForm`
as its only add form. That form calls `addAcquaintance`, which writes to the `acquaintances`
Firestore collection — NOT `profiles`. So any "person" submitted from the Circle tab:

- Does NOT appear in "People & requests" on the Network tab (reads from `profiles`)
- Does NOT get cycled into the Daily Queue (acquaintances require `inQueue: true`; defaults to `false`)
- DOES appear in the Acquaintances/Circle list
- DOES appear in the AcquaintanceForm's "Connections (People)" checkbox list (which lists all profiles)

The Network tab's Person form is correctly wired (`PersonForm → addProfile → profiles collection`).
The fix is in `AcquaintancesPage.jsx` only.

## Fix Instructions

Modify `src/pages/AcquaintancesPage.jsx` to add a tab selector (Person | Acquaintance) above
the form, identical in style to the segmented control on NetworkPage. Based on the selected tab,
show either `PersonForm` (calling `addProfile`) or `AcquaintanceForm` (calling `addAcquaintance`).

### Specific changes to `src/pages/AcquaintancesPage.jsx`:

1. **Add imports:**
   ```js
   import { UserPlus, Contact } from 'lucide-react';
   import { PersonForm, AcquaintanceForm } from '../components/CardForms';
   ```
   Replace the existing `AcquaintanceForm` single import.

2. **Add `profiles` and `addProfile` to the useData() destructure:**
   ```js
   const { acquaintances, profiles, addAcquaintance, addProfile } = useData();
   ```

3. **Add tab state at the top of the component (after existing useState):**
   ```js
   const [formTab, setFormTab] = useState('person');
   ```

4. **Replace the existing `<AcquaintanceForm ... />` block with a tabbed form section:**

   ```jsx
   {/* Tab selector */}
   <div className="mb-3 flex gap-1 rounded-xl bg-[#EFEAE0] p-1">
     {[
       { key: 'person', label: 'Person', Icon: UserPlus },
       { key: 'acquaintance', label: 'Acquaintance', Icon: Contact },
     ].map(({ key, label, Icon }) => (
       <button
         key={key}
         type="button"
         onClick={() => setFormTab(key)}
         className={`flex flex-1 items-center justify-center gap-[6px] rounded-lg py-2 font-['Newsreader'] text-[14px] transition-all ${
           formTab === key
             ? 'border border-[#E6DFD2] bg-white text-[#26241F] shadow-[0_1px_2px_rgba(40,36,31,0.08)]'
             : 'border border-transparent text-[#9A958A]'
         }`}
       >
         <Icon className="h-[14px] w-[14px]" strokeWidth={1.8} />
         {label}
       </button>
     ))}
   </div>

   {/* Form */}
   <div className="rounded-[18px] border border-[#EBE6DC] bg-white p-4 shadow-[0_1px_2px_rgba(40,36,31,0.03)]">
     {formTab === 'person' && (
       <PersonForm groups={[]} onSubmit={addProfile} />
     )}
     {formTab === 'acquaintance' && (
       <AcquaintanceForm profiles={profiles} onSubmit={addAcquaintance} />
     )}
   </div>
   ```

   Note: pass `groups={[]}` to `PersonForm` — the Circle tab doesn't need group assignment.
   If you want group assignment available, import `groups` from `useData()` and pass it instead.

5. **Remove the old standalone form wrapper:**
   The existing code in `AcquaintancesPage.jsx` wraps `AcquaintanceForm` in a single
   `<div className="rounded-[18px] border ...">`. Replace that entire block (the wrapper div
   plus the `<AcquaintanceForm ... />` inside it) with the tabbed section above.

## Expected result after fix

- Adding a "Person" from the Circle tab → writes to `profiles` collection → appears in
  "People & requests" on the Network tab → surfaces in the Daily Queue immediately
  (new profiles have `lastClearedDate: null`, so they're due on first load).
- Adding an "Acquaintance" from the Circle tab → unchanged behavior, writes to `acquaintances`.
- No changes needed to: `DataContext.jsx`, `db.js`, `CardForms.jsx`, `NetworkPage.jsx`,
  `queueMath.js`, or any other file.

## Files to edit

- `src/pages/AcquaintancesPage.jsx` — the only file that needs changing
