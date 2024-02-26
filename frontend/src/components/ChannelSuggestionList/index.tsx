import { useState } from "react"

import { ChannelBlock, PaginatedList } from ".."
import { useFetch } from "../../hooks"
import { getUrl } from "../../utils"
import { TGetChannelList } from "../../types"

export const ChannelSuggestionList = (props: {
    updateSwitch: boolean
    onAction: (channel: string, action: 'add' | 'remove') => Promise<unknown>
}) => {
    const [page, setPage] = useState(1)
    const request = useFetch<TGetChannelList>(
        () => getUrl('/getChannelSuggestionList', {
                page: '' + page,
            }
        ), {
            deps: [page, props.updateSwitch]
        }
    )

    const onClickAction = async (channel: string, action: 'add' | 'remove') => {
        await props.onAction(channel, action)
    }

    return (
        <PaginatedList
            page={page}
            totalPages={request.data?.totalPages}
            isLoading={request.isLoading}
            onChangePage={setPage}
        >
            {request.isLoaded && !request.data?.result.length
                ? <h3 style={{ color: 'white' }}>Nothing found</h3>
                : request.data
                    ? request.data.result.map(channel => (
                        <li key={channel.name}>
                            <ChannelBlock
                                isAdmin
                                isBrowserPreview
                                username={channel.name}
                                onClickCheck={(name) => onClickAction(name, 'add')}
                                onClickRemove={(name) => onClickAction(name, 'remove')}
                            />
                        </li>
                    ))
                    : null
            }
        </PaginatedList>
    )
}
