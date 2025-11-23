import {
  infiniteQueryOptions,
  useInfiniteQuery,
  useQueryClient,
  type InfiniteData,
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
  changeQueue: (options: GetPlayQueueQueryOptions) => void
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
  })

type GetPlayQueueQueryOptions = ReturnType<typeof getPlayQueueQueryOptions>

const PlayQueueContext = createContext<PlayQueueContextType | undefined>(
  undefined,
)

export function PlayQueueProvider({ children }: { children: ReactNode }) {
  const [queryOptions, setQueryOptions] = useState<GetPlayQueueQueryOptions>()
  const [currentIndex, setCurrentIndex] = useState(0)

  const queryClient = useQueryClient()

  const { data, fetchNextPage } = useInfiniteQuery(
    queryOptions ?? getPlayQueueQueryOptions(),
  )

  const queue = useMemo(() => data?.pages.flat() ?? [], [data])
  console.log("PlayQueueProvider useInfiniteQuery", {
    queue,
    queryOptions,
    currentIndex,
  })

  const getPosition = useCallback(
    (index: number) => {
      if (data === undefined) return undefined
      if (data.pages === undefined) return undefined
      let i = 0
      for (let p = 0; p < data.pages.length; p++) {
        const page = data.pages[p]
        for (let j = 0; j < page.length; j++) {
          if (i === index) {
            return { pageIndex: p, index: j }
          }
          i++
        }
      }
    },
    [data],
  )

  const insertAt = useCallback(
    (index: number, item: PlayQueueItem, atEndOfManuallyAdded = false) => {
      const pos = getPosition(index)
      queryClient.setQueryData(getPlayQueueQueryOptions().queryKey, (data) => {
        if (pos === undefined || data === undefined) {
          return {
            pages: [[item]],
            pageParams: [0],
          } satisfies InfiniteData<PlayQueueItem[]>
        }
        const page = data.pages[pos.pageIndex]
        if (!page) {
          return { ...data, pages: [...data.pages, [item]] }
        }
        let j = pos.index
        if (atEndOfManuallyAdded) {
          // Move j to the end of manually added items
          while (j < page.length && page[j]?.manuallyAdded) {
            j++
          }
        }
        const newPage = [...page.slice(0, j), item, ...page.slice(j)]
        const newPages = [
          ...data.pages.slice(0, pos.pageIndex),
          newPage,
          ...data.pages.slice(pos.pageIndex + 1),
        ]
        return { ...data, pages: newPages }
      })
    },
    [queryClient, getPosition],
  )

  const removeAt = useCallback(
    (index: number) => {
      const pos = getPosition(index)
      queryClient.setQueryData(getPlayQueueQueryOptions().queryKey, (data) => {
        if (data === undefined || pos === undefined) return undefined
        const page = data.pages[pos.pageIndex]
        if (!page) return data
        const newPage = [
          ...page.slice(0, pos.index),
          ...page.slice(pos.index + 1),
        ]
        const newPages = [
          ...data.pages.slice(0, pos.pageIndex),
          newPage,
          ...data.pages.slice(pos.pageIndex + 1),
        ]
        return { ...data, pages: newPages }
      })
    },
    [queryClient, getPosition],
  )

  const update = useCallback(
    (index: number, newItem: Partial<PlayQueueItem>) => {
      const old = queue[index]
      if (old) {
        removeAt(index)
        insertAt(index, { ...old, ...newItem })
      }
    },
    [insertAt, queue, removeAt],
  )

  useEffect(() => {
    if (!queue[currentIndex]?.played) {
      update(currentIndex, { played: true })
    }
  }, [currentIndex, queue, update])

  const add = useCallback(
    (item: PlayQueueItem) => {
      insertAt(currentIndex, item, true)
    },
    [insertAt, currentIndex],
  )

  const move = useCallback(
    (fromIndex: number, toIndex: number) => {
      const item = queue[fromIndex]
      removeAt(fromIndex)
      insertAt(toIndex, item)
    },
    [removeAt, insertAt, queue],
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
    async (options: GetPlayQueueQueryOptions) => {
      // keep manually added, unplayed items
      const keepers = queue.filter((item) => item.manuallyAdded && !item.played)

      // set cache synchronously so UI shows keepers immediately
      queryClient.setQueryData(getPlayQueueQueryOptions().queryKey, () => {
        return {
          pages: [keepers],
          pageParams: [null],
        } as InfiniteData<PlayQueueItem[]>
      })

      // update local options so the provider uses the new queryFn for subsequent behavior
      setQueryOptions(options)
      setCurrentIndex(0)

      // Immediately issue a fetch using the merged options so the new queryFn runs now
      const merged = {
        ...getPlayQueueQueryOptions(),
        ...options,
      }
      await queryClient.fetchInfiniteQuery(merged)
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
