import { useState } from 'react'
import { DEFAULT_OUTPUT_ML } from './brewRules'

/** Coffees and grams going into the batch, the output volume and whether to update the price. */
export function useBrewRecipe() {
  const [coffees, setCoffees] = useState([])
  const [selectedCoffee, setSelectedCoffee] = useState(null)
  const [outputMl, setOutputMl] = useState(DEFAULT_OUTPUT_ML)
  const [updatePrice, setUpdatePrice] = useState(false)

  /** Add the selected coffee with these grams; returns false for an invalid amount. */
  const addSelectedCoffee = (grams) => {
    const amount = Number(grams)
    if (!amount || amount <= 0) return false
    setCoffees((current) => [...current, { item: selectedCoffee, grams: amount }])
    setSelectedCoffee(null)
    return true
  }

  const reset = () => {
    setCoffees([])
    setSelectedCoffee(null)
    setOutputMl(DEFAULT_OUTPUT_ML)
    setUpdatePrice(false)
  }

  return {
    coffees,
    selectedCoffee,
    outputMl,
    updatePrice,
    selectCoffee: setSelectedCoffee,
    clearSelection: () => setSelectedCoffee(null),
    addSelectedCoffee,
    removeCoffee: (index) => setCoffees((current) => current.filter((_, position) => position !== index)),
    setOutputMl,
    setUpdatePrice,
    reset,
  }
}
