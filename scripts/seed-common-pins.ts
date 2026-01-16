/**
 * Script to seed the common_pins table with weighted PIN codes
 * Run with: npx tsx scripts/seed-common-pins.ts
 */

import { createClient } from '@supabase/supabase-js'

// Your common PIN list (paste your full list here)
const COMMON_PINS = `1234
1111
0000
1342
1212
2222
4444
1122
1986
2020
7777
5555
1989
9999
6969
2004
1010
4321
6666
1984
1987
1985
8888
2000
1980
1988
1982
2580
1313
1990
1991
1983
1978
1979
1995
1994
1977
1981
3333
1992
1975
2005
1993
1976
1996
2002
1973
2468
1998
1974
1997
5678
2001
1999
1972
1969
2003
1945
2008
2525
2010
2121
2323
1022
1951
2006
1230
1971
4200
1970
2007
1966
2021
1968
2112
1967
2009
1964
1965
1221
0123
1963
2011
5150
2019
2018
1000
2012
1357
1020
1414
1962
1515
1001
1004
1960
2424
2017
1961
2016`
// ... paste your FULL list here (all 10,000 codes)

async function seedCommonPins() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local')
    process.exit(1)
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  // Parse the PIN list
  const pins = COMMON_PINS.trim().split('\n').map((code, index) => ({
    code: code.trim(),
    rank: index + 1
  }))
  
  console.log(`Preparing to seed ${pins.length} common PINs...`)
  
  // Clear existing data
  const { error: deleteError } = await supabase
    .from('common_pins')
    .delete()
    .neq('code', '')  // Delete all rows
  
  if (deleteError) {
    console.error('Error clearing existing pins:', deleteError)
  }
  
  // Insert in batches of 1000 for better performance
  const BATCH_SIZE = 1000
  let inserted = 0
  
  for (let i = 0; i < pins.length; i += BATCH_SIZE) {
    const batch = pins.slice(i, i + BATCH_SIZE)
    const { error } = await supabase
      .from('common_pins')
      .insert(batch)
    
    if (error) {
      console.error(`Error inserting batch ${i / BATCH_SIZE + 1}:`, error)
      process.exit(1)
    }
    
    inserted += batch.length
    console.log(`Inserted ${inserted} / ${pins.length} pins...`)
  }
  
  console.log(`✅ Successfully seeded ${inserted} common PINs!`)
  console.log('\nWeighted selection is now active:')
  console.log('  - Rank 1-10: High priority (10x)')
  console.log('  - Rank 11-1000: Very high weight (15x)')
  console.log('  - Rank 1001-3000: High weight (10x)')
  console.log('  - Rank 3001-5000: Medium weight (5x)')
  console.log('  - Rank 5001-10000: Low weight (3x)')
  console.log('  - Not in list: Very low weight (1x)')
}

seedCommonPins().catch(console.error)
