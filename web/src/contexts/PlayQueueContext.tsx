import {
  infiniteQueryOptions,
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

export type PlayQueueItem = {
  cursor: string
  trackId: number
  manuallyAdded?: boolean
  played?: boolean
}

type PlayQueueContextType = {
  items: PlayQueueItem[]
  index: number
  add: (item: PlayQueueItem) => void
  move: (fromIndex: number, toIndex: number) => void
  next: () => void
  prev: () => void
  queueKey?: readonly unknown[]
  changeQueue: (options: GetPlayQueueQueryOptions, index?: number) => void
  set: (index: number) => void
}

const getPlayQueueQueryOptions = () =>
  infiniteQueryOptions({
    queryKey: ["playQueue"],
    queryFn: async () => {
      return [] as PlayQueueItem[]
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.length === 0) return undefined
      return lastPage[lastPage.length - 1].cursor
    },
    initialPageParam: "",
    initialData: { pages: [[]], pageParams: [""] },
  })

const getPagePosition = (pages: PlayQueueItem[][], globalIndex: number) => {
  let i = 0
  let pageIndex = 0
  let index = 0
  for (pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    const page = pages[pageIndex]
    for (index = 0; index < page.length; index++) {
      if (i === globalIndex) {
        return { pageIndex, index }
      }
      i++
    }
  }
  return { pageIndex: -1, index: -1 }
}

const insertIntoPages = (
  pages: PlayQueueItem[][],
  globalIndex: number,
  items: PlayQueueItem[],
  atEndOfManuallyAdded = false,
) => {
  const pos = getPagePosition(pages, globalIndex)
  const page = pages[pos.pageIndex]
  if (!page) {
    throw new Error(
      "insertIntoPages: page not found - ensure queue is setup before manually adding items",
    )
  }
  let j = pos.index
  if (atEndOfManuallyAdded) {
    // Move j to the end of manually ad ded items
    while (j < page.length && page[j]?.manuallyAdded) {
      j++
    }
  }
  const updatedPage = [...page.slice(0, j), ...items, ...page.slice(j)]
  const updatedPages = [
    ...pages.slice(0, pos.pageIndex),
    updatedPage,
    ...pages.slice(pos.pageIndex + 1),
  ]
  return updatedPages
}

const removeFromPages = (pages: PlayQueueItem[][], globalIndex: number) => {
  const pos = getPagePosition(pages, globalIndex)
  const page = pages[pos.pageIndex]

  const updatedPage = [
    ...page.slice(0, pos.index),
    ...page.slice(pos.index + 1),
  ]
  const updatedPages = [
    ...pages.slice(0, pos.pageIndex),
    updatedPage,
    ...pages.slice(pos.pageIndex + 1),
  ]
  return updatedPages
}

const movePageItem = (
  pages: PlayQueueItem[][],
  fromGlobalIndex: number,
  toGlobalIndex: number,
) => {
  if (fromGlobalIndex < toGlobalIndex) {
    toGlobalIndex--
  }
  const itemPos = getPagePosition(pages, fromGlobalIndex)
  const item = pages[itemPos.pageIndex][itemPos.index]
  let updatedPages = removeFromPages(pages, fromGlobalIndex)
  updatedPages = insertIntoPages(updatedPages, toGlobalIndex, [item])
  return updatedPages
}

const updatePageItem = (
  pages: PlayQueueItem[][],
  globalIndex: number,
  newItem: Partial<PlayQueueItem>,
) => {
  const pos = getPagePosition(pages, globalIndex)
  const page = pages[pos.pageIndex]
  if (!page) {
    return pages
  }
  const old = page[pos.index]
  if (old) {
    const updatedItem = { ...old, ...newItem }
    const updatedPage = [
      ...page.slice(0, pos.index),
      updatedItem,
      ...page.slice(pos.index + 1),
    ]
    const updatedPages = [
      ...pages.slice(0, pos.pageIndex),
      updatedPage,
      ...pages.slice(pos.pageIndex + 1),
    ]
    return updatedPages
  }
  return pages
}

type GetPlayQueueQueryOptions = ReturnType<typeof getPlayQueueQueryOptions>

const PlayQueueContext = createContext<PlayQueueContextType | undefined>(
  undefined,
)

export function PlayQueueProvider({ children }: { children: ReactNode }) {
  const [queryOptionsParam, setQueryOptions] =
    useState<GetPlayQueueQueryOptions>()
  const [currentIndex, setCurrentIndex] = useState(0)

  const queryClient = useQueryClient()

  const queryOptions = queryOptionsParam ?? getPlayQueueQueryOptions()
  const { data, fetchNextPage } = useInfiniteQuery(queryOptions)

  const queue = useMemo(() => data?.pages.flat() ?? [], [data])

  const insertAt = useCallback(
    (index: number, items: PlayQueueItem[], atEndOfManuallyAdded = false) => {
      queryClient.setQueryData(queryOptions.queryKey, (data) => {
        if (data === undefined) return data
        const res = {
          ...data,
          pages: insertIntoPages(
            data.pages,
            index,
            items,
            atEndOfManuallyAdded,
          ),
        }
        return res
      })
    },
    [queryClient, queryOptions],
  )

  const removeAt = useCallback(
    (index: number) => {
      queryClient.setQueryData(queryOptions.queryKey, (data) => {
        if (data === undefined) return data
        return {
          ...data,
          pages: removeFromPages(data.pages, index),
        }
      })
    },
    [queryClient, queryOptions],
  )

  const move = useCallback(
    (fromIndex: number, toIndex: number) => {
      queryClient.setQueryData(queryOptions.queryKey, (data) => {
        if (data === undefined) return data
        return {
          ...data,
          pages: movePageItem(data.pages, fromIndex, toIndex),
        }
      })
      if (fromIndex < currentIndex && toIndex >= currentIndex) {
        setCurrentIndex((prev) => prev - 1)
      } else if (fromIndex > currentIndex && toIndex <= currentIndex) {
        setCurrentIndex((prev) => prev + 1)
      }
    },
    [currentIndex, queryClient, queryOptions.queryKey],
  )

  const update = useCallback(
    (index: number, newItem: Partial<PlayQueueItem>) => {
      queryClient.setQueryData(queryOptions.queryKey, (data) => {
        if (data === undefined) return data
        return {
          ...data,
          pages: updatePageItem(data.pages, index, newItem),
        }
      })
    },
    [queryClient, queryOptions],
  )

  useEffect(() => {
    if (!queue[currentIndex]?.played) {
      update(currentIndex, { played: true })
    }
  }, [currentIndex, queue, update])

  const add = useCallback(
    (item: PlayQueueItem) => {
      insertAt(currentIndex + 1, [item], true)
    },
    [insertAt, currentIndex],
  )

  const next = useCallback(() => {
    setCurrentIndex((prevIndex) => Math.min(prevIndex + 1, queue.length - 1))
  }, [queue])

  const prev = useCallback(() => {
    setCurrentIndex((prevIndex) => Math.max(prevIndex - 1, 0))
  }, [])

  const set = useCallback((index: number) => {
    setCurrentIndex((prev) => (prev === index ? prev : index))
  }, [])

  const changeQueue = useCallback(
    async (options: GetPlayQueueQueryOptions, index: number = 0) => {
      // keep manually added, unplayed items
      const keepers = queue.filter((item) => item.manuallyAdded && !item.played)

      // Clear the existing queue
      queryClient.removeQueries({ queryKey: options.queryKey })

      if (typeof options.initialData === "function") {
        throw new Error("initialData as function not supported")
      }

      if (options.initialData && options.initialData.pages.length > 0)
        options.initialData = {
          ...options.initialData,
          pages: insertIntoPages(options.initialData.pages, index, keepers),
        }

      setQueryOptions(options)
      setCurrentIndex(index)
    },
    [queryClient, queue],
  )

  // Load more when nearing the end of the queue
  useEffect(() => {
    console.log("PlayQueueProvider useEffect checking for more fetch", {
      queueLength: queue,
      currentIndex,
    })
    if (currentIndex > queue.length - 2) {
      console.log("PlayQueueProvider fetching next page")
      fetchNextPage()
    }
  }, [queue, currentIndex, fetchNextPage])

  return (
    <PlayQueueContext.Provider
      value={{
        items: queue,
        index: currentIndex,
        add,
        move,
        next,
        prev,
        set,
        queueKey: queryOptions?.queryKey,
        changeQueue,
      }}
    >
      {children}
    </PlayQueueContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePlayQueue() {
  const context = useContext(PlayQueueContext)
  if (!context) {
    throw new Error("usePlayQueue must be used within a PlayQueueProvider")
  }
  return context
}
