--
-- PostgreSQL database dump
--

-- Dumped from database version 17.0
-- Dumped by pg_dump version 17.3 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: notify_data_update(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.notify_data_update() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  PERFORM pg_notify('data_update', row_to_json(NEW)::text);
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.notify_data_update() OWNER TO postgres;

--
-- Name: notify_new_post(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.notify_new_post() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    PERFORM pg_notify('new_post', row_to_json(NEW)::text);
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.notify_new_post() OWNER TO postgres;

--
-- Name: notify_update(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.notify_update() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    payload JSON;
BEGIN
    CASE TG_OP
        WHEN 'INSERT' THEN
            payload = json_build_object(
                'action', 'insert',
                'id', NEW.id,
                'user_id', NEW.user_id,
                'text', NEW.text
            );
        WHEN 'UPDATE' THEN
            payload = json_build_object(
                'action', 'update',
                'id', NEW.id,
                'user_id', NEW.user_id,
                'text', NEW.text
            );
        WHEN 'DELETE' THEN
            payload = json_build_object(
                'action', 'delete',
                'id', OLD.id,
                'user_id', OLD.user_id,
                'text', OLD.text
            );
    END CASE;
    
    -- Concatenate channel name with lower-cased operation for clarity.
    PERFORM pg_notify('data_update_' || lower(TG_OP), payload::text);
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;


ALTER FUNCTION public.notify_update() OWNER TO postgres;

--
-- Name: update_timestamp(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_timestamp() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: add_posts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.add_posts (
    id bigint NOT NULL,
    user_id bigint,
    text text NOT NULL
);


ALTER TABLE public.add_posts OWNER TO postgres;

--
-- Name: add_posts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.add_posts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.add_posts_id_seq OWNER TO postgres;

--
-- Name: add_posts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.add_posts_id_seq OWNED BY public.add_posts.id;


--
-- Name: posts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.posts (
    id integer NOT NULL,
    user_id bigint,
    text text,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.posts OWNER TO postgres;

--
-- Name: posts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.posts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.posts_id_seq OWNER TO postgres;

--
-- Name: posts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.posts_id_seq OWNED BY public.posts.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name text,
    password text,
    email text
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: add_posts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.add_posts ALTER COLUMN id SET DEFAULT nextval('public.add_posts_id_seq'::regclass);


--
-- Name: posts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posts ALTER COLUMN id SET DEFAULT nextval('public.posts_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: add_posts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.add_posts (id, user_id, text) FROM stdin;
1	3	a
2	3	asdasd
3	3	asdfasdf
4	3	asdasd
5	3	asdasdasd
6	3	123
7	3	asdasd
8	3	aaaaaa
9	3	asd
10	3	a
11	3	asd
12	3	asd
\.


--
-- Data for Name: posts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.posts (id, user_id, text, updated_at) FROM stdin;
322	3	ывапвыапываasdf	2025-02-18 20:54:08.144574
320	3	вапвыапваasdf	2025-02-18 20:54:12.389575
326	3	dfgdsfgdfg	2025-02-19 02:48:14.282581
327	3	1111	2025-02-19 02:48:17.918688
328	3	a	2025-02-19 02:48:42.174998
329	3	a	2025-02-19 02:49:48.979346
304	11	dsl;fsdf	2025-02-18 19:23:05.658452
178	8	This is a new post	2025-01-30 15:40:54.121684
179	8	This is a new post	2025-01-30 15:40:54.121684
180	8	This is a new post1	2025-01-30 15:40:54.121684
181	8	This is a new post2	2025-01-30 15:40:54.121684
335	3	Сообщения обновляются в реальном времени	2025-02-19 21:55:38.636236
343	3	Чтобы войти можно использовать данные Логин:123 Пароль:1	2025-02-19 22:00:25.465612
319	3	124ыовлафывдлаоылвдаолыфоалдывоалдфывоадлоывдлаолыдфвоадыва	2025-02-19 22:02:21.429078
347	47	123	2025-02-19 22:15:25.452993
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, name, password, email) FROM stdin;
3	123	1	123@123
8	john_doe	secure_password	john.doe@example.com
1	john_doae	secure_apassword	john.doea@example.com
11	ASd	1	sad@sd.d
24	ASdf	1	asd@asd.as
26	ASdff	1	ASD@ASD.ASD
33	123546	214234	ASD@ASD.ASD34
36	3123	1	ASD@ASD.ASDdsfasdf
38	1233445	a	ASD@ASD.ASd
42	1234	1	ASD@ASD.f
43	ыфв	ыd	фыв
47	12345	1	ывдла@as.a
\.


--
-- Name: add_posts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.add_posts_id_seq', 12, true);


--
-- Name: posts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.posts_id_seq', 347, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 47, true);


--
-- Name: add_posts add_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.add_posts
    ADD CONSTRAINT add_posts_pkey PRIMARY KEY (id);


--
-- Name: posts posts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_pkey PRIMARY KEY (id);


--
-- Name: users unique_email; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT unique_email UNIQUE (email);


--
-- Name: users unique_name; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT unique_name UNIQUE (name);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_add_posts_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_add_posts_user_id ON public.add_posts USING btree (user_id);


--
-- Name: idx_posts_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_posts_user_id ON public.posts USING btree (user_id);


--
-- Name: posts data_update_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER data_update_trigger AFTER INSERT OR DELETE OR UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.notify_data_update();


--
-- Name: posts new_post_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER new_post_trigger AFTER INSERT ON public.posts FOR EACH ROW EXECUTE FUNCTION public.notify_new_post();


--
-- Name: posts notify_event; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER notify_event AFTER INSERT OR DELETE OR UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.notify_update();


--
-- Name: posts trigger_notify_update; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_notify_update AFTER INSERT ON public.posts FOR EACH ROW EXECUTE FUNCTION public.notify_update();


--
-- Name: posts update_post_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_post_timestamp BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();


--
-- Name: posts fk_posts_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT fk_posts_user FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

